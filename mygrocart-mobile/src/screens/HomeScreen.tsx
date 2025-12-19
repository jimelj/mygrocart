import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello{user ? `, ${user.name}` : ''}!
        </Text>
        <Text style={styles.subtitle}>
          Find the best grocery deals near you
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Ionicons name="barcode" size={48} color="#FFFFFF" />
          <Text style={styles.cardTitle}>Scan Barcode</Text>
          <Text style={styles.cardDescription}>
            Scan product barcodes to add items to your list
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.secondaryCard]}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={48} color="#16A34A" />
          <Text style={[styles.cardTitle, styles.darkText]}>Search Products</Text>
          <Text style={[styles.cardDescription, styles.darkText]}>
            Browse and search for products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.secondaryCard]}
          onPress={() => navigation.navigate('List')}
        >
          <Ionicons name="list" size={48} color="#16A34A" />
          <Text style={[styles.cardTitle, styles.darkText]}>My Shopping List</Text>
          <Text style={[styles.cardDescription, styles.darkText]}>
            View and manage your grocery list
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How it works</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Add products to your shopping list</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Compare prices at nearby stores</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>Save money on your groceries!</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#16A34A',
  },
  secondaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#F0FDF4',
    textAlign: 'center',
  },
  darkText: {
    color: '#111827',
  },
  infoSection: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#4B5563',
  },
});
