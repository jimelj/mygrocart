import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import ListScreen from '../screens/ListScreen';
import ComparisonScreen from '../screens/ComparisonScreen';

const Stack = createNativeStackNavigator();

export default function ListStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
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
        headerTintColor: '#16A34A',
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="ListMain"
        component={ListScreen}
        options={{
          title: 'My List',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Comparison"
        component={ComparisonScreen}
        options={{
          title: 'Price Comparison',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
}
