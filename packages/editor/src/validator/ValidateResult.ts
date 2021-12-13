export class ValidateResult {
  position = {
    componentId: '',
    traitType: '',
  };
  isValid = false
  constructor(
    public message: string,
    componentId = '',
    traitType = '',
    public fix: () => void = () => undefined
  ) {
    this.position.componentId = componentId;
    this.position.traitType = traitType;
  }
}
