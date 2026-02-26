import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Simple email+password login.
// Later you can replace this with your "username + PIN" system using a custom auth flow.

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)
    if (signInError) setError(signInError.message)
  }

  return (
    <div className="min-h-screen bg-[#F1F4F6] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white border-[#2E5C6E]/20">
        <CardHeader>
          <CardTitle className="text-[#1E1E1E]">Sign in</CardTitle>
          <p className="text-sm text-[#2E5C6E]">
            Use the login details provided by your school.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#1E1E1E]">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-[#1E1E1E]">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0CC0DF] hover:bg-[#0AB0CF] text-white"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
