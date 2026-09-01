/** @deprecated Import from `../space` or `@genispace/geniapp/ui` Space exports */
export {
  SpaceContext as TeamContext,
  SpaceProvider as TeamProvider,
  useSpace as useTeam,
  type Space as Team,
  type SpaceMember as TeamMember,
  type SpaceOwner as TeamOwner,
  type SpaceApiClient as TeamApiClient,
  type SpaceProviderProps as TeamProviderProps,
  getSpaceIconType as getTeamIconType,
  getSpaceIconStyle as getTeamIconStyle,
  roleColors,
  useRoleNames,
  getRoleName,
  getRoleNameEn,
  getRoleClass,
  type SubscriptionPlan,
} from '../space/SpaceContext';

/** @deprecated Import SpaceSwitcher from `../space` */
export {
  SpaceSwitcher as TeamSwitcher,
  type SpaceSwitcherProps as TeamSwitcherProps,
} from '../space/SpaceSwitcher';
