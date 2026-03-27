-- Fix: Admins/owners cannot see profiles of pending join requests.
--
-- The "read_group_member_profiles" policy only allows viewing profiles
-- where gm.status = 'approved'. When getPendingRequests() joins with
-- profiles, the profile is NULL for pending members, and the DAL
-- filters them out — so admins see an empty pending list.
--
-- Fix: Expand the policy to also allow viewing profiles of pending
-- members when the viewer is an admin/owner of that group.

DROP POLICY IF EXISTS "read_group_member_profiles" ON profiles;
CREATE POLICY "read_group_member_profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.user_id = profiles.id
      AND (
        -- Approved members: visible to all group members
        (gm.status = 'approved' AND is_group_member(gm.group_id, auth.uid()))
        OR
        -- Pending members: visible to admins/owners of the group
        (gm.status = 'pending' AND EXISTS (
          SELECT 1 FROM group_members admin_gm
          WHERE admin_gm.group_id = gm.group_id
            AND admin_gm.user_id = auth.uid()
            AND admin_gm.status = 'approved'
            AND admin_gm.role IN ('owner', 'admin')
        ))
      )
  )
);
