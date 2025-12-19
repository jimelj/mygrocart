import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@apollo/client';
import { REQUEST_PRODUCT } from '../graphql/mutations';

interface Props {
  searchTerm: string;
}

export const EmptySearchState: React.FC<Props> = ({ searchTerm }) => {
  const [requestProduct, { loading }] = useMutation(REQUEST_PRODUCT, {
    variables: { productName: searchTerm },
    onCompleted: () => {
      Alert.alert(
        'Request Submitted',
        `Product "${searchTerm}" requested! We'll add it within 24 hours.`,
        [{ text: 'OK' }]
      );
    },
    onError: (error) => {
      Alert.alert(
        'Error',
        'Failed to submit request. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Request product error:', error);
    },
  });

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={64} color="#9CA3AF" style={styles.icon} />

      <Text style={styles.heading}>
        No products found for "{searchTerm}"
      </Text>

      <Text style={styles.description}>
        We don't have this product yet, but you can request it!
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => requestProduct()}
        disabled={loading}
        accessibilityLabel={`Request ${searchTerm}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading }}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Requesting...' : `Request "${searchTerm}"`}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Ionicons name="time" size={16} color="#6B7280" />
        <Text style={styles.footerText}>We'll add it within 24 hours</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 64,
  },
  icon: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
});
