import { RequestUser } from './common/interfaces/user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
