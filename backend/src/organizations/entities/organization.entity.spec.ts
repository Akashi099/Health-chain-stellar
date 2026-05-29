import { getMetadataArgsStorage } from 'typeorm';

import { OrganizationType } from '../enums/organization-type.enum';
import { VerificationStatus } from '../enums/verification-status.enum';

import { OrganizationEntity } from './organization.entity';

describe('OrganizationEntity', () => {
  const metadata = getMetadataArgsStorage();

  it('defines required organization columns', () => {
    const columns = metadata.columns
      .filter((column) => column.target === OrganizationEntity)
      .map((column) => column.propertyName);

    expect(columns).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'type',
        'verificationStatus',
        'latitude',
        'longitude',
        'operatingHours',
        'verificationDocuments',
        'rating',
        'reviewCount',
      ]),
    );
  });

  it('enforces organization type and verification enums', () => {
    const typeColumn = metadata.columns.find(
      (column) =>
        column.target === OrganizationEntity && column.propertyName === 'type',
    );
    const verificationStatusColumn = metadata.columns.find(
      (column) =>
        column.target === OrganizationEntity &&
        column.propertyName === 'verificationStatus',
    );

    const typeEnumValues = Object.values(
      (typeColumn?.options.enum ?? {}) as Record<string, string>,
    );
    const verificationEnumValues = Object.values(
      (verificationStatusColumn?.options.enum ?? {}) as Record<string, string>,
    );

    expect(typeEnumValues).toEqual(
      expect.arrayContaining(Object.values(OrganizationType)),
    );
    expect(verificationEnumValues).toEqual(
      expect.arrayContaining(Object.values(VerificationStatus)),
    );
  });

  it('stores geolocation fields as decimal coordinates', () => {
    const latitudeColumn = metadata.columns.find(
      (column) =>
        column.target === OrganizationEntity &&
        column.propertyName === 'latitude',
    );
    const longitudeColumn = metadata.columns.find(
      (column) =>
        column.target === OrganizationEntity &&
        column.propertyName === 'longitude',
    );

    expect(latitudeColumn?.options.type).toBe('decimal');
    expect(longitudeColumn?.options.type).toBe('decimal');
    expect(latitudeColumn?.options.precision).toBe(10);
    expect(latitudeColumn?.options.scale).toBe(7);
    expect(longitudeColumn?.options.precision).toBe(10);
    expect(longitudeColumn?.options.scale).toBe(7);
  });

  it('defines indexes for location queries', () => {
    const indexNames = metadata.indices
      .filter((index) => index.target === OrganizationEntity)
      .map((index) => index.name);

    expect(indexNames).toEqual(
      expect.arrayContaining([
        'IDX_ORGANIZATIONS_LOCATION',
        'IDX_ORGANIZATIONS_CITY_COUNTRY',
      ]),
    );
  });

  it('defines rating aggregation fields', () => {
    const ratingColumn = metadata.columns.find(
      (column) =>
        column.target === OrganizationEntity &&
        column.propertyName === 'rating',
    );
    const reviewCountColumn = metadata.columns.find(
      (column) =>
        column.target === OrganizationEntity &&
        column.propertyName === 'reviewCount',
    );

    expect(ratingColumn).toBeDefined();
    expect(reviewCountColumn).toBeDefined();
  });
});
