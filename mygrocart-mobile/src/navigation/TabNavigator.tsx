import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import ProductSearchScreen from '../screens/ProductSearchScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyRequestsScreen from '../screens/MyRequestsScreen';

// Import navigators
import ListStackNavigator from './ListStackNavigator';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'barcode' : 'barcode-outline';
          } else if (route.name === 'ListTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Requests') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2d7a4c',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: '#111827',
        },
        headerTintColor: '#2d7a4c',
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'MyGroCart',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={ProductSearchScreen}
        options={{
          title: 'Search',
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={BarcodeScannerScreen}
        options={{
          title: 'Scan',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="ListTab"
        component={ListStackNavigator}
        options={{
          title: 'My List',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Requests"
        component={MyRequestsScreen}
        options={{
          title: 'Requests',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
