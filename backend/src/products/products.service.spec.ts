import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SearchService } from '../search/search.service';
import { S3CleanupService } from '../s3-cleanup/s3-cleanup.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;
  let cache: CacheService;
  let search: SearchService;

  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    warehouseInventory: {
      deleteMany: jest.fn(),
    },
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    getOrSet: jest.fn(),
    invalidateProductLists: jest.fn(),
    invalidateHomepage: jest.fn(),
    invalidateOnProductWrite: jest.fn(),
  };

  const mockSearch = {
    indexProduct: jest.fn(),
    removeProduct: jest.fn(),
  };

  const mockS3Cleanup = {};
  const mockRedis = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: SearchService, useValue: mockSearch },
        { provide: S3CleanupService, useValue: mockS3Cleanup },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CacheService>(CacheService);
    search = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySlug', () => {
    it('should return a cached product if present', async () => {
      const mockProduct = { id: 'prod-1', name: 'Saree 1', slug: 'saree-1' };
      mockCache.getOrSet.mockResolvedValue(mockProduct);

      const result = await service.findBySlug('saree-1');
      expect(cache.getOrSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.any(Number)
      );
      expect(result).toEqual(mockProduct);
    });

    it('should query DB if not cached', async () => {
      const mockProduct = { id: 'prod-1', name: 'Saree 1', slug: 'saree-1' };
      mockCache.getOrSet.mockImplementation(async (key, fetcher) => fetcher());
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findBySlug('saree-1');
      expect(cache.getOrSet).toHaveBeenCalled();
      expect(prisma.product.findUnique).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product is missing', async () => {
      mockCache.getOrSet.mockImplementation(async (key, fetcher) => fetcher());
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
