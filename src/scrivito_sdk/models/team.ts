export interface TeamData {
  id: string;
  name: string;
  description?: string;
}

/** @public */
export class Team {
  /** @internal */
  constructor(
    /** @internal */
    private readonly teamData: TeamData
  ) {}

  id(): string {
    return this.teamData.id;
  }

  name(): string {
    return this.teamData.name;
  }

  description(): string {
    return this.teamData.description || '';
  }
}
