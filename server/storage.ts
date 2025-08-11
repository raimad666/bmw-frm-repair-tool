import { type User, type InsertUser, type FrmRepair, type InsertFrmRepair } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getFrmRepair(id: string): Promise<FrmRepair | undefined>;
  createFrmRepair(repair: InsertFrmRepair): Promise<FrmRepair>;
  updateFrmRepair(id: string, updates: Partial<FrmRepair>): Promise<FrmRepair | undefined>;
  getFrmRepairsByStatus(status: string): Promise<FrmRepair[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private frmRepairs: Map<string, FrmRepair>;

  constructor() {
    this.users = new Map();
    this.frmRepairs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getFrmRepair(id: string): Promise<FrmRepair | undefined> {
    return this.frmRepairs.get(id);
  }

  async createFrmRepair(insertRepair: InsertFrmRepair): Promise<FrmRepair> {
    const id = randomUUID();
    const repair: FrmRepair = {
      ...insertRepair,
      id,
      createdAt: new Date(),
    };
    this.frmRepairs.set(id, repair);
    return repair;
  }

  async updateFrmRepair(id: string, updates: Partial<FrmRepair>): Promise<FrmRepair | undefined> {
    const existing = this.frmRepairs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.frmRepairs.set(id, updated);
    return updated;
  }

  async getFrmRepairsByStatus(status: string): Promise<FrmRepair[]> {
    return Array.from(this.frmRepairs.values()).filter(
      (repair) => repair.repairStatus === status
    );
  }
}

export const storage = new MemStorage();
