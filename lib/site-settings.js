// Site Settings Helper for Writer's Pocket

import prisma from './prisma';

// Default settings
const DEFAULT_SETTINGS = {
  // Homepage settings
  'homepage.show_recent_releases': true,
  'homepage.show_best_sellers': true,
  'homepage.best_sellers_mode': 'auto', // 'auto' or 'manual'
  'homepage.show_live_counter': true,
  'homepage.publishing_steps': [
    'Manuscript Upload',
    'Initial Review',
    'Professional Editing',
    'Cover Design',
    'Interior Formatting',
    'ISBN Assignment',
    'Distribution',
  ],
  
  // Free Publishing settings
  'free_publishing.processing_fee': 999,
  'free_publishing.original_fee': 1499,
  'free_publishing.show_discount': true,
  'free_publishing.signup_mode': 'lead', // 'lead' or 'payment'
  'free_publishing.whatsapp_enabled': true,
  'free_publishing.whatsapp_number': '+919876543210',
  'free_publishing.whatsapp_text': 'Chat with us',
  
  // Writing Challenge settings
  'writing_challenge.fee': 1999,
  'writing_challenge.original_fee': 2999,
  'writing_challenge.show_discount': true,
  'writing_challenge.duration_days': 45,
  'writing_challenge.min_submissions': 30,
  'writing_challenge.prompts_count': 50,
  
  // Shop settings
  'shop.default_shipping_days': '5-7',
  'shop.shipping_message': 'Standard delivery: 5-7 days',
  
  // General settings
  'general.site_name': "Writer's Pocket",
  'general.tagline': 'Your Story Deserves To Be Published',
  'general.contact_email': 'support@writerspocket.com',
  'general.contact_phone': '+91 98765 43210',
  'general.logo_url': null,
  'general.favicon_url': null,
};

// Get a setting value
export async function getSetting(key) {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key },
    });
    
    if (setting) {
      return setting.value;
    }
    
    // Return default if exists
    return DEFAULT_SETTINGS[key] ?? null;
  } catch (error) {
    console.error('Error getting setting:', key, error);
    return DEFAULT_SETTINGS[key] ?? null;
  }
}

// Get multiple settings
export async function getSettings(keys) {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    });
    
    const result = {};
    keys.forEach(key => {
      const found = settings.find(s => s.key === key);
      result[key] = found ? found.value : (DEFAULT_SETTINGS[key] ?? null);
    });
    
    return result;
  } catch (error) {
    console.error('Error getting settings:', error);
    const result = {};
    keys.forEach(key => {
      result[key] = DEFAULT_SETTINGS[key] ?? null;
    });
    return result;
  }
}

// Get all settings for a category
export async function getSettingsByCategory(category) {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { category },
    });
    
    // Merge with defaults
    const result = {};
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      if (key.startsWith(category + '.')) {
        result[key] = value;
      }
    });
    
    settings.forEach(s => {
      result[s.key] = s.value;
    });
    
    return result;
  } catch (error) {
    console.error('Error getting settings by category:', error);
    const result = {};
    Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
      if (key.startsWith(category + '.')) {
        result[key] = value;
      }
    });
    return result;
  }
}

// Set a setting value
export async function setSetting(key, value, category = null) {
  try {
    const setting = await prisma.siteSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        category: category || key.split('.')[0],
      },
      update: {
        value,
        category: category || key.split('.')[0],
      },
    });
    
    return setting;
  } catch (error) {
    console.error('Error setting value:', key, error);
    throw error;
  }
}

// Set multiple settings
export async function setSettings(settings) {
  const results = [];
  for (const [key, value] of Object.entries(settings)) {
    const result = await setSetting(key, value);
    results.push(result);
  }
  return results;
}

// Get default settings (for initialization)
export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}
