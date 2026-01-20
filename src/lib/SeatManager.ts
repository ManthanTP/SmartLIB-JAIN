import { supabase } from './supabase';

export const SeatManager = {
    /**
     * Checks all currently occupied seats and releases those past their booking_end time.
     * Logic: If current time > booking_end, set status to available and clear occupancy fields.
     */
    async checkAndReleaseExpiredSeats(checkInWindowMinutes: number = 15) {
        const now = new Date();
        const nowIso = now.toISOString();
        const gracePeriodAgo = new Date(now.getTime() - checkInWindowMinutes * 60 * 1000).toISOString();

        // 1. Find seats past their booking_end
        // 2. Find seats where is_checked_in is false and booking_start < grace period ago
        const { data: expiredSeats, error } = await supabase
            .from('seats')
            .select('id, seat_number, status, booking_start, booking_end, is_checked_in')
            .eq('status', 'occupied')
            .or(`booking_end.lt.${nowIso},and(is_checked_in.eq.false,booking_start.lt.${gracePeriodAgo})`);

        if (error) {
            console.error('Error fetching expired/no-show seats:', error);
            return;
        }

        if (expiredSeats && expiredSeats.length > 0) {
            const ids = expiredSeats.map(s => s.id);

            const { error: updateError } = await supabase
                .from('seats')
                .update({
                    status: 'available',
                    occupied_by: null,
                    booking_start: null,
                    booking_end: null,
                    is_checked_in: false,
                    checked_in_at: null
                })
                .in('id', ids);

            if (updateError) {
                console.error('Error releasing seats:', updateError);
            } else {
                console.log(`Auto-released ${expiredSeats.length} expired or no-show seats.`);
            }
        }
    },

    /**
     * Searches for a student by USN, Name, or Email and returns their current seat.
     */
    async findStudentSeat(rawQuery: string) {
        const query = rawQuery.trim();
        if (!query) return null;

        try {
            // 1. Search by Name or Email in users table
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(1);

            if (userError) {
                console.error('User search error:', userError);
            }

            let userId = users?.[0]?.id;

            // 2. Fallback to searching USN in profiles table
            if (!userId) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id')
                    .ilike('student_id', `%${query}%`)
                    .limit(1);

                if (profileError) {
                    console.error('Profile search error:', profileError);
                }
                userId = profiles?.[0]?.id;
            }

            if (!userId) return null;

            // 3. Find seat occupied by this user
            const { data: seat, error: seatError } = await supabase
                .from('seats')
                .select(`
                    *,
                    occupant:users(
                        full_name,
                        profiles(student_id)
                    )
                `)
                .eq('occupied_by', userId)
                .maybeSingle();

            if (seatError) {
                console.error('Seat fetch error:', seatError);
            }

            return seat || null;
        } catch (err) {
            console.error('Unexpected error in findStudentSeat:', err);
            return null;
        }
    },

    /**
     * Searches for multiple students by Name, Email, or USN and returns their seat status.
     * Used for real-time premium search.
     */
    async searchStudents(query: string) {
        if (!query || query.length < 2) return [];

        try {
            // Search users and join with profiles
            const { data: users } = await supabase
                .from('users')
                .select(`
                    id,
                    full_name,
                    email,
                    profiles(student_id)
                `)
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(5);

            let results = users || [];

            // If we have less than 5 results, try matching profiles by student_id directly
            if (results.length < 5) {
                const { data: extraProfiles } = await supabase
                    .from('profiles')
                    .select(`
                        id,
                        student_id,
                        user:users(id, full_name, email)
                    `)
                    .ilike('student_id', `%${query}%`)
                    .limit(5 - results.length);

                if (extraProfiles) {
                    extraProfiles.forEach(p => {
                        if (p.user && !results.find(r => r.id === (p.user as any).id)) {
                            results.push({
                                id: (p.user as any).id,
                                full_name: (p.user as any).full_name,
                                email: (p.user as any).email,
                                profiles: { student_id: p.student_id }
                            } as any);
                        }
                    });
                }
            }

            if (results.length === 0) return [];

            // For each user found, check if they are seated
            const userIds = results.map(u => u.id);
            const { data: seats } = await supabase
                .from('seats')
                .select('*, occupant:users(full_name, profiles(student_id))')
                .in('occupied_by', userIds)
                .eq('status', 'occupied');

            return results.map(user => {
                const seat = seats?.find(s => s.occupied_by === user.id);
                return {
                    user,
                    seat: seat || null
                };
            });
        } catch (err) {
            console.error('Error in searchStudents:', err);
            return [];
        }
    },

    /**
     * Checks if a student already has an active seat booking.
     */
    async hasActiveBooking(userId: string) {
        const { data, error } = await supabase
            .from('seats')
            .select('id, seat_number')
            .eq('occupied_by', userId)
            .eq('status', 'occupied')
            .maybeSingle();

        if (error) {
            console.error('Error checking active booking:', error);
            return null;
        }
        return data;
    }
};
