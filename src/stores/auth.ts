import { writable } from 'svelte/store';
import type { User } from '../types';

export const token = writable<string | null>(localStorage.getItem('token'));
export const userType = writable<'user' | 'admin' | null>(localStorage.getItem('userType') as 'user' | 'admin' | null);
export const currentUser = writable<User | null>(null);