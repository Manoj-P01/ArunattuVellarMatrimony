import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Expanded Next.js Server Action for full Matrimony Registration
async function registerFullProfile(formData: FormData): Promise<void> {
  'use server'

  const email       = formData.get('email')    as string
  const password    = formData.get('password') as string
  const name        = formData.get('name')     as string
  const profileType = formData.get('type')     as string
  const dob         = formData.get('dob')      as string
  const district    = formData.get('district') as string
  const education   = formData.get('education') as string

  if (!email || !password || !name || !profileType) {
    redirect('/?error=missing_fields')
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })

  if (authError || !authData.user) {
    console.error('Signup Error:', authError)
    redirect('/?error=signup_failed')
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{
      user_id:   authData!.user!.id,
      type:      profileType,
      name,
      dob:       dob       || null,
      district:  district  || null,
      education: education || null,
    }])

  if (profileError) {
    console.error('Profile insertion error:', profileError)
    redirect('/?error=profile_failed')
  }

  redirect('/?success=true')
}


export default async function Page({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const resolvedParams = await searchParams

  // Fetch all existing profiles to verify insertions are working
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, name, type, district, education, users(email)')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>AVS Matrimony Registration</h1>
      
      {resolvedParams.success && (
        <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '10px', marginBottom: '20px', borderRadius: '5px' }}>
          Registration Successful! Your profile is pending admin approval.
        </div>
      )}

      <div style={{ border: '1px solid #ccc', padding: '20px', maxWidth: '500px', marginBottom: '40px', borderRadius: '8px' }}>
        <h3>Create Your Profile</h3>
        
        <form action={registerFullProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '5px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>1. Account Info</p>
            <input type="email" name="email" placeholder="Email Address" required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
            <input type="password" name="password" placeholder="Password" required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div style={{ padding: '10px', background: '#e9ecef', borderRadius: '5px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>2. Profile Details</p>
            <input type="text" name="name" placeholder="Full Name" required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
            
            <select name="type" required style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
              <option value="">Select Profile Type...</option>
              <option value="bride">Bride</option>
              <option value="groom">Groom</option>
            </select>

            <input type="date" name="dob" placeholder="Date of Birth" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
            <input type="text" name="district" placeholder="District (e.g., Chennai)" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
            <input type="text" name="education" placeholder="Education (e.g., B.E., M.B.A.)" style={{ width: '100%', padding: '8px' }} />
          </div>

          <button type="submit" style={{ padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Register Matrimony Profile
          </button>
        </form>
      </div>

      <div>
        <h3>Recent Profiles (From Database)</h3>
        {fetchError && <p style={{ color: 'red' }}>Error fetching profiles: {fetchError.message}</p>}
        {profiles?.length === 0 && <p>No profiles found. Register the first one above!</p>}
        
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {profiles?.map((profile: any) => (
            <li key={profile.id} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
              <strong style={{ fontSize: '18px' }}>{profile.name}</strong> 
              <span style={{ background: '#0070f3', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '10px' }}>
                {profile.type.toUpperCase()}
              </span>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>
                {profile.users?.email} | District: {profile.district || 'N/A'} | Edu: {profile.education || 'N/A'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
