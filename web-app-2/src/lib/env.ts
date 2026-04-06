function getEnvVar(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  get NEXT_PUBLIC_SUPABASE_URL() {
    return getEnvVar('NEXT_PUBLIC_SUPABASE_URL')
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
  },
} as const
