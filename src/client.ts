import {
  ExecutionHistory,
  IntegrationProviderAPIError,
  IntegrationProviderAuthenticationError,
} from '@jupiterone/integration-sdk-core';
import { URL, URLSearchParams } from 'url';
import fetch, { RequestInit } from 'node-fetch';
import { IntegrationConfig } from './config';
import {
  Company,
  Owner,
  ResourceIteratee,
  Role,
  User,
  HubspotPaginatedResponse,
  HubspotRequestConfig,
  LegacyHubspotPaginatedResponse,
} from './types';

export class APIClient {
  private readonly apiBaseUrl: string;
  private readonly oauthAccessToken: string;
  private readonly executionHistory: ExecutionHistory;
  private readonly legacyMaxPerPage = 30;

  constructor(
    readonly integrationConfig: IntegrationConfig,
    executionHistory: ExecutionHistory,
  ) {
    this.apiBaseUrl = integrationConfig.apiBaseUrl;
    this.oauthAccessToken = integrationConfig.oauthAccessToken;
    this.executionHistory = executionHistory;
  }

  private get<T>(resource: string): Promise<T> {
    return this.query<T>(resource);
  }

  private async iterateLegacy<T>(
    resource: string,
    onEach: ResourceIteratee<T>,
    config: HubspotRequestConfig,
  ): Promise<void> {
    let data: LegacyHubspotPaginatedResponse | null = null;
    do {
      data = await this.query<LegacyHubspotPaginatedResponse>(resource, {
        params: {
          ...config?.params,
          count: this.legacyMaxPerPage,
          offset: data ? data.offset : 0,
        },
      });

      for (const it of data?.results || []) {
        await onEach(it);
      }
    } while (data?.results && data?.hasMore);
  }

  private async iterate<T>(
    resource: string,
    onEach: ResourceIteratee<T>,
    config?: HubspotRequestConfig,
  ): Promise<void> {
    const pagination: any = {};
    let data: HubspotPaginatedResponse | null = null;
    do {
      data = await this.query<HubspotPaginatedResponse>(resource, {
        ...config,
        ...pagination,
      });
      pagination.after = data?.paging?.next?.after;
      for (const it of data?.results || []) {
        await onEach(it);
      }
    } while (data?.results && data?.paging?.next?.after);
  }

  private async query<T>(
    resource: string,
    config?: HubspotRequestConfig,
    init?: RequestInit,
  ): Promise<T> {
    const url = new URL(`${this.apiBaseUrl}${resource}`);
    const params = new URLSearchParams(config?.params).toString();
    url.search = params.toString();

    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.oauthAccessToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.status === 'error') {
      throw new IntegrationProviderAPIError({
        endpoint: url.toString(),
        status: res.status,
        statusText: res.statusText,
      });
    }

    return data as T;
  }

  public async verifyAuthentication(): Promise<void> {
    try {
      const tokens = await this.get('/crm/v3/properties/contacts');
      if (!tokens) {
        throw new Error('Provider authentication failed');
      }
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: `/crm/v3/properties/contacts`,
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  public async iterateOwners(iteratee: ResourceIteratee<Owner>) {
    try {
      await this.iterate<Owner>('/crm/v3/owners', iteratee);
    } catch (err) {
      throw new IntegrationProviderAPIError({
        cause: err,
        endpoint: `/crm/v3/owners`,
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  public async iterateRoles(iteratee: ResourceIteratee<Role>) {
    try {
      await this.iterate<Role>('/settings/v3/users/roles', iteratee);
    } catch (err) {
      throw new IntegrationProviderAPIError({
        cause: err,
        endpoint: `/settings/v3/users/roles`,
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  public async fetchUser(userId: string): Promise<User> {
    try {
      const user = await this.get<User>(`/settings/v3/users/${userId}`);
      return user;
    } catch (err) {
      throw new IntegrationProviderAPIError({
        cause: err,
        endpoint: `/settings/v3/users/{userId}`,
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  // This seem to require legacy endpoint because we want to use `executionHistory`
  // with the following endpoint https://legacydocs.hubspot.com/docs/methods/companies/get_companies_modified
  public async iterateCompanies(iteratee: ResourceIteratee<Company>) {
    try {
      await this.iterateLegacy<Company>(
        '/companies/v2/companies/recent/modified',
        iteratee,
        {
          params: {
            // If this is the first run, we want to get all companies once and later just the modified since
            since: this.executionHistory.lastSuccessful?.startedOn || 0,
            count: this.legacyMaxPerPage,
          },
        },
      );
    } catch (err) {
      throw new IntegrationProviderAPIError({
        cause: err,
        endpoint: `/crm/v3/objects/companies`,
        status: err.status,
        statusText: err.statusText,
      });
    }
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  executionHistory: ExecutionHistory,
): APIClient {
  return new APIClient(config, executionHistory);
}
