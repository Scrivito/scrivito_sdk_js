import { Team, TeamData } from 'scrivito_sdk/models/team';

export interface EditorData {
  id: string;
  name: string;
}

/** @public */
export class Editor {
  /** @internal */
  constructor(
    /** @internal */
    private readonly editorData: EditorData,

    /** @internal */
    private readonly teamsData: TeamData[]
  ) {}

  id(): string {
    return this.editorData.id;
  }

  name(): string {
    return this.editorData.name;
  }

  teams(): Team[] {
    return this.teamsData.map((teamData) => new Team(teamData));
  }
}
