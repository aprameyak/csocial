import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { api } from '../../src/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.includes('@')) { Alert.alert('Invalid Email', 'Please enter a valid email address'); return; }
    setLoading(true);
    try {
      await api.auth.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successContainer}>
            <Ionicons name="mail-open-outline" size={64} color={Colors.success} />
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>We sent a password reset link to {email}. Check your inbox and follow the instructions.</Text>
            <Button title="Back to Login" onPress={() => router.push('/(auth)/login')} size="lg" style={{ marginTop: Spacing.xl, width: '100%' }} />
          </View>
        ) : (
          <>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a link to reset your password.</Text>
            <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" placeholder="you@example.com" containerStyle={{ marginBottom: Spacing.xl }} />
            <Button title="Send Reset Link" onPress={handleSubmit} loading={loading} size="lg" style={{ width: '100%' }} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.xl },
  back: { marginBottom: Spacing.xl },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.xxxl, fontWeight: FontWeight.heavy, color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl, lineHeight: 22, textAlign: 'center' },
});
