import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

export interface User {
  id: string;
  email: string;
  credits: number; // Now supports decimal values (NUMERIC in DB)
  keywords: string[];
  scanInterval: number; // in hours
  baseTime?: string; // HH:MM format
  useCustomSchedule?: boolean;
  lastScanAt?: string;
  createdAt: string;
}

export async function hashPassword(password: string): Promise<string> {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function createUser(
  email: string,
  password: string
): Promise<User> {
  const hashedPassword = await hashPassword(password);

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      password: hashedPassword,
      credits: parseInt(process.env.DEFAULT_CREDITS || '100'),
      keywords: [],
      scan_interval: parseInt(process.env.DEFAULT_SCAN_INTERVAL || '2'),
      base_time: null,
      use_custom_schedule: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    email: data.email,
    credits: data.credits,
    keywords: data.keywords || [],
    scanInterval: data.scan_interval,
    lastScanAt: data.last_scan_at,
    createdAt: data.created_at,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    credits: data.credits,
    keywords: data.keywords || [],
    scanInterval: data.scan_interval,
    baseTime: data.base_time,
    useCustomSchedule: data.use_custom_schedule || false,
    lastScanAt: data.last_scan_at,
    createdAt: data.created_at,
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    credits: data.credits,
    keywords: data.keywords || [],
    scanInterval: data.scan_interval,
    baseTime: data.base_time,
    useCustomSchedule: data.use_custom_schedule || false,
    lastScanAt: data.last_scan_at,
    createdAt: data.created_at,
  };
}

export async function updateUserCredits(
  userId: string,
  credits: number
): Promise<void> {
  console.log(`📊 Updating user ${userId} credits to ${credits}`);
  
  const { error } = await supabaseAdmin
    .from('users')
    .update({ credits })
    .eq('id', userId);

  if (error) {
    console.error('❌ Failed to update user credits:', error);
    throw new Error(`Failed to update credits: ${error.message}`);
  }

  console.log(`✅ Successfully updated user ${userId} credits to ${credits}`);
}

export async function updateUserConfig(
  userId: string,
  keywords: string[],
  scanInterval: number,
  baseTime?: string | null,
  useCustomSchedule?: boolean
): Promise<void> {
  const updateData: any = { 
    keywords, 
    scan_interval: scanInterval 
  };
  
  if (baseTime !== undefined) {
    updateData.base_time = baseTime;
  }
  
  if (useCustomSchedule !== undefined) {
    updateData.use_custom_schedule = useCustomSchedule;
  }

  await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId);
}

export async function updateLastScan(userId: string): Promise<void> {
  await supabaseAdmin
    .from('users')
    .update({ last_scan_at: new Date().toISOString() })
    .eq('id', userId);
}
