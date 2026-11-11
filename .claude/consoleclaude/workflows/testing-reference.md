# Testing — Reference
> **Revisione doc:** 2026-04

> Contiene la piramide, la configurazione di Vitest per Next.js ed esempi di test per Angular, NestJS, FastAPI e React Native; alcuni esempi omettono gli import.

---

## Piramide dei test

```
         /\
        /e2e\         ← Pochi, lenti, costosi — solo flussi critici
       /------\
      /integr. \      ← Moderati — DB reale, API reale, comportamento aggregato
     /----------\
    /  unit test  \   ← Molti, veloci, isolati — logica pura, service, utility
   /--------------\
```

---

## Next.js — Vitest + Testing Library

```
Struttura:
src/
├── __tests__/         ← test integrazione (route handlers, server actions)
└── components/
    └── Button/
        ├── Button.tsx
        └── Button.test.tsx   ← co-locato con il componente
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles:  ['./src/test/setup.ts'],
    globals: true,
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
// MSW handlers per mock API calls
import { server } from './mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Angular — Jest + Spectator

```typescript
// user-list.component.spec.ts
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { UserListComponent } from './user-list.component';
import { UserService } from '../services/user.service';
import { of } from 'rxjs';

describe('UserListComponent', () => {
  let spectator: Spectator<UserListComponent>;

  const createComponent = createComponentFactory({
    component: UserListComponent,
    mocks: [UserService],
  });

  beforeEach(() => {
    spectator = createComponent();
    spectator.inject(UserService).getUsers.mockReturnValue(of([
      { id: '1', name: 'Mario', email: 'mario@test.it' },
    ]));
  });

  it('dovrebbe mostrare la lista utenti', () => {
    spectator.detectChanges();
    expect(spectator.query('li')).toHaveText('Mario');
  });
});
```

---

## NestJS — Jest + `@nestjs/testing`

```typescript
// users.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  const mockRepo = {
    findOneBy: jest.fn(),
    create:    jest.fn(),
    save:      jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('dovrebbe creare un utente se email non esiste', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ id: '1', name: 'Mario' });
      mockRepo.save.mockResolvedValue({ id: '1', name: 'Mario' });

      const result = await service.create({ name: 'Mario', email: 'mario@test.it', password: '12345678' });
      expect(result.name).toBe('Mario');
    });

    it('dovrebbe lanciare ConflictException se email esiste', async () => {
      mockRepo.findOneBy.mockResolvedValue({ id: '1' });
      await expect(
        service.create({ name: 'Mario', email: 'mario@test.it', password: '12345678' })
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

---

## FastAPI — Pytest + httpx

```python
# tests/test_users.py  (test di integrazione: qui la cartella tests/ è l'eccezione ammessa)
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_create_user():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post("/users/", json={
            "name": "Mario",
            "email": "mario@test.it",
            "password": "12345678",
        })
    assert res.status_code == 201
    assert res.json()["email"] == "mario@test.it"
    assert "password" not in res.json()


@pytest.mark.asyncio
async def test_create_user_duplicate_email(db_session):
    # crea il primo utente
    await UserService(db_session).create(UserCreate(
        name="Mario", email="mario@test.it", password="12345678"
    ))
    # secondo con stessa email deve fallire
    with pytest.raises(HTTPException) as exc:
        await UserService(db_session).create(UserCreate(
            name="Luigi", email="mario@test.it", password="12345678"
        ))
    assert exc.value.status_code == 409
```

---

## React Native — Jest + Testing Library RN

```typescript
// UserCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UserCard } from './UserCard';

describe('UserCard', () => {
  const user = { id: '1', name: 'Mario', role: 'Admin' };

  it('dovrebbe mostrare nome e ruolo', () => {
    render(<UserCard {...user} />);
    expect(screen.getByText('Mario')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('dovrebbe chiamare onPress al tap', () => {
    const onPress = jest.fn();
    render(<UserCard {...user} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('user-card'));
    expect(onPress).toHaveBeenCalledWith('1');
  });
});
```

---

## Regole generali — Dettagli

- **Co-location**: file di test vicino al file testato (`.test.ts` / `_test.py`) — non in una cartella `tests/` separata (eccetto test integrazione)
- **Naming**: `dovrebbe [comportamento] se [condizione]` — niente nomi come `test1` o `funziona`
- **Mock**: solo dipendenze esterne (DB, HTTP, filesystem) — niente mock di logica interna
- **Dati di test**: costanti esplicite in cima al file — niente magic values inline
- **Asserzioni**: una asserzione logica per test — se servono 5 `expect`, spezza in 2 test
- **Coverage target**: 80% su service e utility — 60% su component — non inseguire il 100%
- Dopo ogni bug fix: scrivi il test che avrebbe catturato il bug prima del fix
