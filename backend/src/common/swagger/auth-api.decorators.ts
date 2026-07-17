import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { SWAGGER_AUTH_SCHEME } from './swagger-auth.constants';

export function AuthenticatedApi() {
  return applyDecorators(ApiBearerAuth(SWAGGER_AUTH_SCHEME));
}

export function AdminApi() {
  return applyDecorators(ApiBearerAuth(SWAGGER_AUTH_SCHEME));
}
