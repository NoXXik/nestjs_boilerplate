import { SetMetadata } from '@nestjs/common';

export const ACCESS_CHECK_KEY = 'access_check';

export interface AccessRequirement {
  moduleCode: string;
  tabCode: string;
  actionCode: string;
}

export const RequireAccess = (requirement: AccessRequirement) =>
  SetMetadata(ACCESS_CHECK_KEY, requirement);

