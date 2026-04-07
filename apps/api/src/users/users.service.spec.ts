import { UsersService } from './users.service';

// Pure unit tests for email normalization behaviour.
// Covers the case-insensitivity fix end-to-end at the service layer
// without requiring a DB or Nest testing module.

describe('UsersService — email normalization', () => {
  let prismaMock: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: UsersService;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    // Cast through unknown — we only exercise methods that touch prisma.user
    // and don't construct via the DI container.
    service = new UsersService(
      prismaMock as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
    );
  });

  describe('findByEmail', () => {
    it('lowercases a mixed-case email before querying Prisma', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.findByEmail('JAMIE.SARGENT@MYVISION.ORG.UK');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jamie.sargent@myvision.org.uk' },
      });
    });

    it('trims surrounding whitespace', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.findByEmail('  Jamie@Example.com  ');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jamie@example.com' },
      });
    });

    it('leaves already-lowercase emails unchanged', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.findByEmail('jamie@example.com');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'jamie@example.com' },
      });
    });
  });
});
