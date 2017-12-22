open Wonder_jest;

let _ =
  describe(
    "generate index reason file",
    () => {
      open Expect;
      open Expect.Operators;
      open Sinon;
      let sandbox = getSandboxDefaultVal();
      let destFilePath = ref("");
      beforeEach(() => sandbox := createSandbox());
      afterEach(
        () =>
          if (Node.Fs.existsSync(destFilePath^)) {
            Node.Fs.unlinkSync(destFilePath^)
          } else {
            ()
          }
      );
      test(
        "test index file",
        () => {
          open WonderCommonlib;
          open Node;
          destFilePath := Path.join([|Process.cwd(), "test/res/Index.re"|]);
          let rootDir = Path.join([|Process.cwd(), "test/res"|]);
          let sourceFileGlobArr = [|"*.re", "api/*.re"|];
          let destDir = "./test/res/";
          let config = {"exclude": [|"System.re"|]};
          let result = Generate.generate("/", rootDir, sourceFileGlobArr, destDir, config);
          Fs.readFileAsUtf8Sync(destFilePath^)
          |> expect
          |> toContainString(
               {|let minus_2 = Test2.minus_2;

let minus = Test2.minus;

let constant1 = Test1.constant1;

let add1 = Test1.add1;|}
             )
        }
      )
    }
  );