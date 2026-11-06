import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotifications } from '../notifications';
import { PoolProvider } from '../state/PoolProvider';
import { TestsProvider } from '../state/TestsProvider';
import { colours } from '../theme';

configureNotifications();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Fall back to system fonts rather than a blank screen if fonts fail to load.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <PoolProvider>
        <TestsProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colours.background },
            animation: 'fade',
            animationDuration: 150,
          }}
        />
        </TestsProvider>
      </PoolProvider>
    </SafeAreaProvider>
  );
}
