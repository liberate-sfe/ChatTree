declare module "rangy" {
  const rangy: {
    init: () => void;
    getSelection: () => Selection;
  };
  export default rangy;
}
