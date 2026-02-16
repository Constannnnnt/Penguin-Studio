import set from 'lodash/set';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';

export interface Command {
  execute(state: any): any;
  undo(state: any): any;
}

/**
 * OCP: UpdateCommand allows for extending state mutation logic without modifying core engine.
 */
export class UpdateCommand implements Command {
  constructor(
    private path: string,
    private value: any,
    private previousValue?: any
  ) {}

  public execute(state: any): any {
    const newState = cloneDeep(state);
    if (this.previousValue === undefined) {
      this.previousValue = get(state, this.path);
    }
    set(newState, this.path, this.value);
    return newState;
  }

  public undo(state: any): any {
    const newState = cloneDeep(state);
    set(newState, this.path, this.previousValue);
    return newState;
  }
}

/**
 * SRP: CommandInvoker handles the execution and registration of commands.
 */
export class CommandInvoker {
  private history: Command[] = [];

  public invoke(state: any, command: Command): any {
    const newState = command.execute(state);
    this.history.push(command);
    return newState;
  }

  // Future-proof: undo/redo support
}
