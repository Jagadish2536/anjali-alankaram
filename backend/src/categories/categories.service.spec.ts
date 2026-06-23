import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new category if it does not exist', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.create.mockResolvedValue({ id: '1', name: 'Kurtas', slug: 'kurtas', isActive: true });

      const result = await service.create({ name: 'Kurtas' });
      expect(result).toEqual({ id: '1', name: 'Kurtas', slug: 'kurtas', isActive: true });
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: { name: 'Kurtas', slug: 'kurtas' },
      });
    });

    it('should throw ConflictException if category exists and is active', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: '1', name: 'Kurtas', slug: 'kurtas', isActive: true });

      await expect(service.create({ name: 'Kurtas' })).rejects.toThrow(ConflictException);
    });

    it('should reactivate and update category if it exists and is inactive', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: '1', name: 'Kurtas', slug: 'kurtas', isActive: false });
      mockPrismaService.category.update.mockResolvedValue({ id: '1', name: 'Kurtas Restored', slug: 'kurtas', isActive: true });

      const result = await service.create({ name: 'Kurtas Restored' });
      expect(result).toEqual({ id: '1', name: 'Kurtas Restored', slug: 'kurtas', isActive: true });
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Kurtas Restored', isActive: true },
      });
    });
  });

  describe('update', () => {
    it('should update category if no conflict', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue(null);
      mockPrismaService.category.update.mockResolvedValue({ id: '1', name: 'New Kurtas', slug: 'new-kurtas' });

      const result = await service.update('1', { name: 'New Kurtas' });
      expect(result).toEqual({ id: '1', name: 'New Kurtas', slug: 'new-kurtas' });
    });

    it('should throw ConflictException on update if another category has the same slug', async () => {
      mockPrismaService.category.findUnique.mockResolvedValue({ id: '2', name: 'Kurtas', slug: 'kurtas' });

      await expect(service.update('1', { name: 'Kurtas' })).rejects.toThrow(ConflictException);
    });
  });
});
