/* tslint:disable */

import * as walk from 'walk';
import * as fs from 'fs';
import * as path from 'path';
import {SERIALIZABLE_TYPES} from "../core/decorators";

let types : {[key:string]:any} = {};
const loaded : {[key:string]:any} = {};

let packageJson = null;
const loadParentPackageJson = () : Promise<any> => {
  return packageJson === null ? new Promise((resolve) => {
    const initPath = (() => {
      const gbl : any = <any> global;
      if (gbl && gbl.resourceBaseDir) {
        return gbl.resourceBaseDir;
      }
      let initPath = path.resolve(path.join(__dirname, '/../../'));
      if (path.basename(initPath) === 'dist') {
        initPath = path.resolve(path.join(initPath, '/..'));
      }
      if (initPath.indexOf('/node_modules/') > -1) {
        initPath = path.resolve(path.join(initPath, '/../../'));
      }
      return initPath;
    })();
    const parentPath = path.join(initPath, 'package.json');
    fs.readFile(parentPath, (err, data) => {
      packageJson = JSON.parse(data + '');
      packageJson._path = parentPath;
      resolve(packageJson);
    });
  }) : Promise.resolve(packageJson);
};

export const typeLoader = (typeName, callback) => {
  types = {
    ...SERIALIZABLE_TYPES,
    ...types
  };
  if (types.hasOwnProperty(typeName)) {
    callback(null, types[typeName]);
  } else {
    loadParentPackageJson().then((packageJson : any) => {
      const baseDir = path.dirname(packageJson._path);
      const baseDirs = [`${baseDir}/lib`, `${baseDir}/src`, `${baseDir}/spec`];
      if (packageJson.includeModules) {
        packageJson.includeModules.forEach((module : string) => {
          baseDirs.push(`${baseDir}/node_modules/${module}/src`);
          baseDirs.push(`${baseDir}/node_modules/${module}/lib`);
        });
      }
      Promise.all(baseDirs.map((baseDir : string) => {
        return new Promise((resolve) => {
          fs.stat(baseDir, (err : Error) => {
            if (err) {
              resolve(null);
            } else {
              walk.walk(baseDir)
                .on('file', (root, fileStats, next) => {
                  if (/\.(js|ts)$/.test(fileStats.name)) {
                    const fullpath = path.join(root, fileStats.name);
                    fs.readFile(fullpath, (err, data) => {
                      if (err) {
                        callback(err);
                      } else {
                        if (data.toString().indexOf(`class ${typeName}`) > -1) {
                          if (!loaded.hasOwnProperty(fullpath)) {
                            loaded[fullpath] = require(fullpath);
                          }
                          if (!types.hasOwnProperty(typeName)) {
                            types[typeName] = loaded[fullpath].name === typeName ?
                              loaded[fullpath] :
                              loaded[fullpath][typeName];
                          }
                        }
                      }
                      next();
                    });
                  } else {
                    next();
                  }
                })
                .on('end', () => {
                  resolve(types[typeName]);
                });
            }
          });
        });
      })).then((resolved) => {
        callback(null, resolved.filter(r => r !== null)[0]);
      });
    })
  }
};

export const createInstanceFromJson = (objType, json) => {
  json = typeof json === 'string' ? JSON.parse(json) : json;
  try {
    const newObj = new objType();
    for (const prop in json) {
      if (json.hasOwnProperty(prop)) {
        newObj[prop] = json[prop];
      }
    }
    return newObj;
  } finally {
    // nothing
  }
};

export const resolveInstanceFromJson = (json, stack?) => {
  if (!stack) {
    try {
      stack = [];
      const isString = typeof json === 'string';
      if (json && !isString && json.constructor && !/^(object|number|array)$/i.test(json.constructor.name)) {
        return Promise.resolve(json);
      }
      json = typeof json === 'string' ? JSON.parse(json) : json;
      const parent = {resolved: json};
      stack.push({parent: parent, field: 'resolved'});
      return resolveInstanceFromJson(json, stack);
    } catch (err) {
      return Promise.reject(err);
    }
  } else if (stack.length === 0) {
    return Promise.resolve(json.resolved);
  }
  const childTypes = Object.keys(json).filter((key) => {
    return json[key] && (json[key].constructor.name === 'Object' && json[key].hasOwnProperty('typeNameMetaData'));
  });
  if (childTypes.length > 0) {
    return Promise.all(childTypes.map(key => {
      return resolveInstanceFromJson(json[key], stack.concat([{
        parent: json,
        field: key
      }]));
    })).then((results) => {
      return results[0];
    });
  } else {
    const typeNameMetaData = json.typeNameMetaData;
    if (typeNameMetaData) {
      return new Promise((resolve, reject) => {
        typeLoader(typeNameMetaData, (err, type) => {
          if (err) {
            reject(err);
          } else {
            const rel = stack.pop();
            try {
              rel.parent[rel.field] = createInstanceFromJson(type, json);
              resolve(resolveInstanceFromJson(rel.parent, stack));
            } catch (err) {
              reject(err);
            }
          }
        });
      });
    } else {
      return Promise.resolve(json);
    }
  }
};
