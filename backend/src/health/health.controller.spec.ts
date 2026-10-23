import { Test } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const pingCheck = jest.fn();
  const check = jest.fn((indicators: Array<() => unknown>) =>
    Promise.all(indicators.map((indicator) => indicator())),
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check } },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck } },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('comprueba la conexión a la base de datos', async () => {
    pingCheck.mockResolvedValue({ database: { status: 'up' } });

    await expect(controller.check()).resolves.toEqual([
      { database: { status: 'up' } },
    ]);
    expect(pingCheck).toHaveBeenCalledWith('database');
  });
});
