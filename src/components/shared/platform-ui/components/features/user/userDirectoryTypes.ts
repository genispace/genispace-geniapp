export type PublicUserProfile = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  status?: string;
};

/** Minimal GeniSpace client surface for user directory hooks. */
export type UserDirectoryClient = {
  spaces: {
    listMemberProfiles(params?: { status?: string }): Promise<PublicUserProfile[]>;
  };
  users: {
    getPublicProfiles(userIds: string[]): Promise<PublicUserProfile[]>;
  };
};
