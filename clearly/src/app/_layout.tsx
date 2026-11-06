import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotifications } from '../notifications';
import { PoolProvider } from '../state/PoolProvider';
import { RemindersProvider } from '../state/RemindersProvider';
import { SettingsProvider, useSettings } from '../state/SettingsProvider';
import { TestsProvider } from '../state/TestsProvider';
import { useColours } from '../theme';

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
      <SettingsProvider>
        <PoolProvider>
          <TestsProvider>
            <RemindersProvider>
              <AppStack />
            </RemindersProvider>
          </TestsProvider>
        </PoolProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function AppStack() {
  const colours = useColours();
  const { loading } = useSettings();
  // Wait for settings so sun mode doesn't flash the normal palette first.
  if (loading) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colours.background },
          animation: 'fade',
          animationDuration: 150,
        }}
      />
    </>
  );
}
