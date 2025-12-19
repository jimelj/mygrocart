import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client/react';
import { ADD_GROCERY_LIST_ITEM } from '../graphql/queries';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

interface Product {
  upc: string;
  name: string;
  brand: string;
  size: string;
  imageUrl?: string;
}

export default function BarcodeScannerScreen({ navigation }: any) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const [addToList] = useMutation(ADD_GROCERY_LIST_ITEM);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: any) => {
    setScanned(true);
    setIsLoading(true);

    try {
      // Fetch product info from OpenFoodFacts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const productData = await response.json();

      if (productData.status === 1) {
        const fetchedProduct: Product = {
          upc: data,
          name: productData.product.product_name || 'Unknown Product',
          brand: productData.product.brands || 'Unknown Brand',
          size: productData.product.quantity || 'Unknown Size',
          imageUrl: productData.product.image_url,
        };
        setProduct(fetchedProduct);
      } else {
        Alert.alert(
          'Product Not Found',
          `UPC: ${data}\nThis product was not found in the database.`,
          [{ text: 'Scan Again', onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to fetch product information. Please try again.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToList = async () => {
    if (!user || !product) return;

    try {
      await addToList({
        variables: {
          userId: user.userId,
          upc: product.upc,
          quantity: 1,
        },
      });

      Alert.alert(
        'Success!',
        `${product.name} has been added to your list.`,
        [
          {
            text: 'Scan Another',
            onPress: () => {
              setProduct(null);
              setScanned(false);
            },
          },
          {
            text: 'View List',
            onPress: () => navigation.navigate('List'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add product to list. Please try again.');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color="#DC2626" />
        <Text style={styles.title}>Camera Access Denied</Text>
        <Text style={styles.text}>
          Please enable camera permissions in your device settings to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <>
          <CameraView
            style={styles.camera}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.header}>
                <Text style={styles.headerText}>Scan Product Barcode</Text>
                <Text style={styles.subHeaderText}>
                  Position the barcode within the frame
                </Text>
              </View>

              <View style={styles.scanArea}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
            </View>
          </CameraView>
        </>
      ) : (
        <View style={styles.resultContainer}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.text}>Fetching product information...</Text>
            </>
          ) : product ? (
            <>
              <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
              <Text style={styles.title}>Product Found!</Text>

              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <Text style={styles.productSize}>{product.size}</Text>
                <Text style={styles.productUpc}>UPC: {product.upc}</Text>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAddToList}>
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add to List</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setProduct(null);
                  setScanned(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Scan Another</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subHeaderText: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  scanArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 250,
    height: 250,
    marginLeft: -125,
    marginTop: -125,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#16A34A',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#16A34A',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#16A34A',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#16A34A',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 24,
  },
  text: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    marginTop: 16,
  },
  productInfo: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  productBrand: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  productUpc: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: 'monospace',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  button: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
});
