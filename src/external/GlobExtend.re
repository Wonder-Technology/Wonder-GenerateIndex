type syncConfig = {. "cwd": string};

[@bs.val] [@bs.module "glob"] external syncWithConfig : (string, syncConfig) => array(string) =
  "sync";