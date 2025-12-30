
// Use default import for Dexie to ensure proper inheritance and type recognition of instance methods in TypeScript.
import Dexie, { type Table } from 'dexie';
import { User, Category, Goal, Decision, WishlistItem, WishlistStatus } from './types';

// Use the default Dexie import to properly extend the class and access its methods like version().
export class TrueCostDB extends Dexie {
  users!: Table<User>;
  categories!: Table<Category>;
  goals!: Table<Goal>;
  decisions!: Table<Decision>;
  wishlist!: Table<WishlistItem>;

  constructor() {
    super('TrueCostDB');
    
    // Define the schema within the constructor as per Dexie's standard practice for subclassing.
    // Using the default Dexie import ensures 'this.version' is correctly typed as a method inherited from Dexie.
    this.version(1).stores({
      users: 'id, email',
      categories: 'id, userId, name',
      goals: 'id, userId',
      decisions: 'id, userId, categoryId, createdAt',
      wishlist: 'id, userId, categoryId, status, createdAt'
    });
  }
}

export const db = new TrueCostDB();

// Default categories
export const DEFAULT_CATEGORIES = [
  "Food", "Subscriptions", "Shopping", "Bills", "Travel", "Other"
];

export async function initializeUser(profile: { id: string, name: string, email: string }) {
  const existingUser = await db.users.get(profile.id);
  if (!existingUser) {
    const newUser: User = {
      ...profile,
      defaultWage: 25,
      wageType: 'hourly',
      currency: 'USD',
      createdAt: Date.now()
    };
    await db.users.add(newUser);
    
    // Create default categories for user
    const categoryPromises = DEFAULT_CATEGORIES.map(name => 
      db.categories.add({
        id: crypto.randomUUID(),
        userId: profile.id,
        name,
        isDefault: true,
        createdAt: Date.now()
      })
    );
    await Promise.all(categoryPromises);
    return newUser;
  }
  return existingUser;
}
