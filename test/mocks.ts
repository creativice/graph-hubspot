import { Owner, Team } from '../src/types';

export function getMockOwner(partial?: Partial<Owner>): Owner {
  return {
    id: '84106262',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    userId: 25150127,
    createdAt: '2021-06-14T19:38:46.907Z',
    updatedAt: '2021-06-14T19:38:46.907Z',
    archived: false,
    ...partial,
  };
}

export function getMockTeam(partial?: Partial<Team>): Team {
  return {
    id: '81106262',
    name: 'Team A',
    ...partial,
  };
}
