import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vnjzmsrpjzvowqlpedas.supabase.co'
const supabaseKey = 'sb_publishable_UVLZbkUMIfnozLgP4rutjQ_CaIWLUhu'

export const supabase = createClient(supabaseUrl, supabaseKey)
