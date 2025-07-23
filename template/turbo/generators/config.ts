import { PlopTypes } from "@turbo/gen";
import { snakeCase } from "es-toolkit";
import { mkdir, symlink } from "node:fs/promises";
import path from "node:path";

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // Add a handlebars helper for conditionals
  plop.setHelper("ifCond", (v1, operator, v2, options) => {
    switch (operator) {
      case "==":
        return v1 == v2 ? options.fn(this) : options.inverse(this);
      case "===":
        return v1 === v2 ? options.fn(this) : options.inverse(this);
      case "!=":
        return v1 != v2 ? options.fn(this) : options.inverse(this);
      case "!==":
        return v1 !== v2 ? options.fn(this) : options.inverse(this);
      case "<":
        return v1 < v2 ? options.fn(this) : options.inverse(this);
      case "<=":
        return v1 <= v2 ? options.fn(this) : options.inverse(this);
      case ">":
        return v1 > v2 ? options.fn(this) : options.inverse(this);
      case ">=":
        return v1 >= v2 ? options.fn(this) : options.inverse(this);
      case "&&":
        return v1 && v2 ? options.fn(this) : options.inverse(this);
      case "||":
        return v1 || v2 ? options.fn(this) : options.inverse(this);
      default:
        return options.inverse(this);
    }
  });

  // A custom action which links the new "app" to the test project pack
  plop.setActionType("linkToCogsProjectPack", async (answers: any) => {
    const typedAnswers = answers as { name: string; contentType: string };

    const projectRoot = path.join(__dirname, "..", "..");
    const snakeCaseName = snakeCase(typedAnswers.name);
    const sourcePath = path.join(projectRoot, "apps", snakeCaseName, "dist");
    await mkdir(sourcePath, { recursive: true });

    const typeFolder =
      typedAnswers.contentType === "customContent"
        ? "client_content"
        : "plugins";
    const typeFolderPath = path.join(
      projectRoot,
      "test-project-pack",
      typeFolder,
    );
    await mkdir(typeFolderPath, { recursive: true });
    const destinationPath = path.join(typeFolderPath, snakeCaseName);

    const sourceRelativeToDestination = path.relative(
      path.dirname(destinationPath),
      sourcePath,
    );
    await symlink(sourceRelativeToDestination, destinationPath, "dir");

    return "successfully linked to test project pack";
  });

  /**
   * COGS SDK generator
   */
  plop.setGenerator("cogs-sdk", {
    description: "Generate new custom content or plugin using the COGS SDK",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Name",
      },
      {
        type: "input",
        name: "description",
        message: "Description",
      },
      {
        type: "list",
        name: "contentType",
        message: "Do you want to create custom content or a plugin?",
        choices: [
          {
            name: "Custom Content",
            value: "customContent",
          },
          {
            name: "Plugin",
            value: "plugin",
          },
        ],
      },
      {
        type: "list",
        name: "templateType",
        message: "What template do you want to use?",
        choices: [
          {
            name: "JavaScript",
            value: "javascript",
          },
          {
            name: "JavaScript + React",
            value: "react",
          },
        ],
      },
    ],
    actions: (data) => {
      const destination = "{{ turbo.paths.root }}/apps/{{snakeCase name}}/";

      // Shared actions for all plugins
      const actions: PlopTypes.Actions = [
        {
          type: "addMany",
          destination,
          templateFiles: "templates-shared/**",
        },
      ];

      // Actions to only perform for JavaScript plugins
      if (data?.templateType === "javascript") {
        actions.push({
          type: "addMany",
          destination,
          templateFiles: "templates-javascript/**",
        });
      }

      // Actions to only perform for React plugins
      if (data?.templateType === "react") {
        actions.push({
          type: "addMany",
          destination,
          templateFiles: "templates-react/**",
        });
      }

      // Shared actions for all plugins after creation
      actions.push({ type: "linkToCogsProjectPack" });

      return actions;
    },
  });
}
