import { supabase } from '../lib/supabase';

export type GroupRole = 'owner' | 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  join_code: string;
  member_limit: number;
  avatar_url: string | null;
  created_at: string;
}

export interface GroupMembership {
  group: Group;
  role: GroupRole;
  joined_at: string;
}

export interface GroupMember {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_focusing?: boolean;
  role: GroupRole;
  joined_at: string;
}

const mapMembership = (row: any): GroupMembership => ({
  group: row.groups,
  role: row.role,
  joined_at: row.joined_at,
});

export const GroupService = {
  async createGroup(name: string, description?: string | null, memberLimit = 20): Promise<string> {
    const { data, error } = await supabase.rpc('create_group', {
      p_name: name,
      p_description: description ?? null,
      p_member_limit: memberLimit,
    });
    if (error) throw error;
    return data as string;
  },

  async joinGroupByCode(code: string): Promise<string> {
    const { data, error } = await supabase.rpc('join_group_by_code', { p_code: code });
    if (error) throw error;
    return data as string;
  },

  async getMyGroups(currentUserId: string): Promise<GroupMembership[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('role, joined_at, groups (id, name, description, owner_id, join_code, member_limit, avatar_url, created_at)')
      .eq('user_id', currentUserId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapMembership);
  },

  async getGroupById(groupId: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description, owner_id, join_code, member_limit, avatar_url, created_at')
      .eq('id', groupId)
      .single();

    if (error) throw error;
    return data;
  },

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id, role, joined_at, profiles:profiles (id, username, avatar_url, is_focusing)')
      .eq('group_id', groupId);

    if (error) throw error;

    const mapped = (data || []).map((row: any) => ({
      id: row.profiles?.id ?? row.user_id,
      username: row.profiles?.username ?? null,
      avatar_url: row.profiles?.avatar_url ?? null,
      is_focusing: row.profiles?.is_focusing ?? false,
      role: row.role,
      joined_at: row.joined_at,
    })) as GroupMember[];

    return mapped.sort((a, b) => {
      const order = (role: GroupRole) => (role === 'owner' ? 0 : role === 'admin' ? 1 : 2);
      const diff = order(a.role) - order(b.role);
      if (diff !== 0) return diff;
      return (a.username || '').localeCompare(b.username || '');
    });
  },

  async getGroupMemberIds(groupId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (error) throw error;
    return (data || []).map((row: any) => row.user_id as string);
  },

  async updateGroup(groupId: string, payload: { name?: string; description?: string | null; avatar_url?: string | null }) {
    const { error } = await supabase
      .from('groups')
      .update(payload)
      .eq('id', groupId);

    if (error) throw error;
  },

  async leaveGroup(groupId: string, userId: string) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async removeMember(groupId: string, userId: string) {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async deleteGroup(groupId: string) {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
  },
};
