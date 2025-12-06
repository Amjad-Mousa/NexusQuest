import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signup, type UserRole } from '../services/authService';

export default function SignupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signup(name, email, password, role);
    setLoading(false);

    if (result.success && result.user) {
      // For now both roles go to Dashboard; you can later add a TeacherDashboard route
      navigation.replace('Dashboard');
    } else {
      const raw = result.error || '';
      let msg = raw;

      if (!msg) {
        msg = 'Could not create your account. Please try again in a moment.';
      } else if (/email/i.test(msg) && /registered|exists/i.test(msg)) {
        msg = 'This email is already registered. Try logging in instead.';
      } else if (/password/i.test(msg) && /6/i.test(msg)) {
        msg = 'Password must be at least 6 characters.';
      }

      Alert.alert('Signup failed', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join NexusQuest</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>I am a</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'user' && styles.roleButtonActive]}
              onPress={() => setRole('user')}
            >
              <Text style={[styles.roleButtonText, role === 'user' && styles.roleButtonTextActive]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'teacher' && styles.roleButtonActive]}
              onPress={() => setRole('teacher')}
            >
              <Text style={[styles.roleButtonText, role === 'teacher' && styles.roleButtonTextActive]}>Teacher</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  roleContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  roleLabel: {
    color: '#cbd5e1',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#020617',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#1d4ed8',
  },
  roleButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
});
