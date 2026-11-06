import { StyleSheet, Text, View } from 'react-native';

// Placeholder until the Home screen is built. The dosing engine lives in src/engine.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clearly</Text>
      <Text style={styles.body}>Dosing engine is in. Screens are next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF7', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A9FE0' },
  body: { marginTop: 8, fontSize: 16, color: '#14213D', textAlign: 'center' },
});
