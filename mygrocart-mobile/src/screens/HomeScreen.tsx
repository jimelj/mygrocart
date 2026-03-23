import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { useAuth } from '../context/AuthContext';
import { GET_CURRENT_FLYERS } from '../graphql/queries';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLYER_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const FLYER_CARD_MARGIN = 10;

interface Flyer {
  id: string;
  storeName: string;
  storeSlug: string;
  flyerName: string;
  imageUrls: string[];
  validFrom: string;
  validTo: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const zipCode = user?.zipCode || '30132';
  const [activeStoreIndex, setActiveStoreIndex] = useState(0);
  const flyerListRef = useRef<FlatList>(null);

  const { data, loading, error } = useQuery(GET_CURRENT_FLYERS, {
    variables: { zipCode },
    fetchPolicy: 'cache-and-network',
  });

  const flyers: Flyer[] = data?.getCurrentFlyers || [];

  const handleStoreTabPress = (index: number) => {
    setActiveStoreIndex(index);
    flyerListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  const handleFlyerPress = (flyer: Flyer) => {
    navigation.navigate('FlyerViewer', { flyer });
  };

  const renderFlyerCard = ({ item, index }: { item: Flyer; index: number }) => {
    const coverImage = item.imageUrls?.[0];
    return (
      <TouchableOpacity
        style={styles.flyerCard}
        onPress={() => handleFlyerPress(item)}
        activeOpacity={0.88}
      >
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={styles.flyerImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.flyerImagePlaceholder}>
            <Ionicons name="newspaper-outline" size={48} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.flyerCardFooter}>
          <Text style={styles.flyerStoreName} numberOfLines={1}>
            {item.storeName}
          </Text>
          <Text style={styles.flyerValidity} numberOfLines={1}>
            {item.validTo ? `Valid thru ${new Date(item.validTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : item.flyerName}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFlyerSkeleton = () => (
    <View style={styles.flyerCard}>
      <View style={[styles.flyerImage, styles.skeletonBlock]} />
      <View style={styles.flyerCardFooter}>
        <View style={[styles.skeletonText, { width: '60%' }]} />
        <View style={[styles.skeletonText, { width: '40%', marginTop: 6 }]} />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Tagline */}
      <View style={styles.taglineContainer}>
        <Text style={styles.tagline}>Compare. Shop. Save.</Text>
        {user?.zipCode ? (
          <Text style={styles.taglineSub}>Deals near {user.zipCode}</Text>
        ) : null}
      </View>

      {/* Flyer Carousel */}
      <View style={styles.carouselSection}>
        <Text style={styles.sectionLabel}>This Week's Flyers</Text>
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            keyExtractor={(item) => String(item)}
            renderItem={renderFlyerSkeleton}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
          />
        ) : error || flyers.length === 0 ? (
          <View style={styles.emptyFlyers}>
            <Ionicons name="newspaper-outline" size={40} color="#9CA3AF" />
            <Text style={styles.emptyFlyersText}>No flyers available for your area yet.</Text>
          </View>
        ) : (
          <FlatList
            ref={flyerListRef}
            data={flyers}
            keyExtractor={(item) => item.id}
            renderItem={renderFlyerCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            snapToInterval={FLYER_CARD_WIDTH + FLYER_CARD_MARGIN * 2}
            contentContainerStyle={styles.carouselContent}
            onMomentumScrollEnd={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              const index = Math.round(offset / (FLYER_CARD_WIDTH + FLYER_CARD_MARGIN * 2));
              setActiveStoreIndex(index);
            }}
          />
        )}
      </View>

      {/* Store Tab Bar */}
      {flyers.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.storeTabsScroll}
          contentContainerStyle={styles.storeTabsContent}
        >
          {flyers.map((flyer, index) => (
            <TouchableOpacity
              key={flyer.id}
              style={[
                styles.storeChip,
                activeStoreIndex === index && styles.storeChipActive,
              ]}
              onPress={() => handleStoreTabPress(index)}
            >
              <Text
                style={[
                  styles.storeChipText,
                  activeStoreIndex === index && styles.storeChipTextActive,
                ]}
              >
                {flyer.storeName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EBF5E6' }]}>
              <Ionicons name="search" size={28} color="#367723" />
            </View>
            <Text style={styles.quickActionTitle}>Search Deals</Text>
            <Text style={styles.quickActionSub}>Find products on sale</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('ListTab')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EBF5E6' }]}>
              <Ionicons name="list" size={28} color="#367723" />
            </View>
            <Text style={styles.quickActionTitle}>My Shopping List</Text>
            <Text style={styles.quickActionSub}>View and manage your list</Text>
          </TouchableOpacity>
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
  taglineContainer: {
    backgroundColor: '#367723',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  tagline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  taglineSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  carouselSection: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131313',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  carouselContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  flyerCard: {
    width: FLYER_CARD_WIDTH,
    marginHorizontal: FLYER_CARD_MARGIN,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  flyerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  flyerImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerCardFooter: {
    padding: 12,
  },
  flyerStoreName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131313',
  },
  flyerValidity: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  skeletonBlock: {
    backgroundColor: '#E5E7EB',
  },
  skeletonText: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  storeTabsScroll: {
    marginTop: 16,
  },
  storeTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  storeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  storeChipActive: {
    backgroundColor: '#367723',
    borderColor: '#367723',
  },
  storeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  storeChipTextActive: {
    color: '#FFFFFF',
  },
  emptyFlyers: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyFlyersText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginTop: 28,
    marginBottom: 32,
    paddingHorizontal: 0,
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#131313',
    marginBottom: 4,
  },
  quickActionSub: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
