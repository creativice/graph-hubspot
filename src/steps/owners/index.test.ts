import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';
import { createIntegrationConfig } from '../../../test/config';
import { IntegrationConfig } from '../../config';
import * as owner from '.';
import { Relationships } from '../constants';
import { setupHubspotRecording } from '../../../test/recording';

describe('#fetchOwners', () => {
  // TODO: we'll add recordings later
  let recording: Recording;

  beforeEach(() => {
    recording = setupHubspotRecording({
      directory: __dirname,
      name: 'fetchOwners',
    });
  });

  afterEach(async () => {
    await recording.stop();
  });

  test('should collect data', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig: createIntegrationConfig(),
    });

    await owner.fetchOwners(context);

    expect({
      numCollectedEntities: context.jobState.collectedEntities.length,
      numCollectedRelationships: context.jobState.collectedRelationships.length,
      collectedEntities: context.jobState.collectedEntities,
      collectedRelationships: context.jobState.collectedRelationships,
      encounteredTypes: context.jobState.encounteredTypes,
    }).toMatchSnapshot();

    const owners = context.jobState.collectedEntities.filter((e) =>
      e._class.includes('User'),
    );

    expect(owners.length).toBeGreaterThan(0);
    expect(owners).toMatchGraphObjectSchema({
      _class: ['User'],
      schema: {
        additionalProperties: false,
        properties: {
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          _type: { const: 'hubspot_owner' },
          // We want to make sure we include every field from converter.ts
          name: { type: 'string' },
          email: { type: 'string' },
          userId: { type: 'number' },
          username: { type: 'string' },
          archived: { type: 'boolean' },
          createdOn: { type: 'number' },
          updatedOn: { type: 'number' },
        },
      },
    });

    expect(
      context.jobState.collectedRelationships.filter(
        (e) => e._type === Relationships.OWNER_ASSIGNED_ROLE._type,
      ),
    ).toMatchDirectRelationshipSchema({
      schema: {
        properties: {
          _class: { const: 'OWNER' },
          _type: {
            const: 'hubspot_owner_assigned_role',
          },
        },
      },
    });
  });
});
