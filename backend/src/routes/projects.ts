import { Router, Response } from 'express';
import { Project } from '../models/Project.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { checkProjectAchievements } from '../services/gamificationService.js';
import { getProjectLibraries } from '../services/customLibraryService.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Helper function to get default file name and content based on language
const getDefaultFile = (language: string) => {
    const defaults: Record<string, { name: string; content: string }> = {
        python: {
            name: 'main.py',
            content: `# Main Python file
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
`
        },
        javascript: {
            name: 'main.js',
            content: `// Main JavaScript file
function main() {
    console.log("Hello, World!");
}

main();
`
        },
        java: {
            name: 'Main.java',
            content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`
        },
        cpp: {
            name: 'main.cpp',
            content: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`
        }
    };

    return defaults[language] || { name: 'main.txt', content: '// Start coding here\n' };
};

// Get all projects for current user
// Get all projects for current user
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const projects = await Project.find({ owner: req.userId })
            .select('name description language files dependencies customLibraries createdAt updatedAt')
            .sort({ updatedAt: -1 });

        // Add file paths to custom libraries
        const projectsData = projects.map(project => {
            const projectObj = project.toObject();
            if (projectObj.customLibraries && projectObj.customLibraries.length > 0) {
                projectObj.customLibraries = projectObj.customLibraries.map((lib: any) => ({
                    ...lib,
                    path: `/uploads/libraries/${project._id}/${lib.fileName}`
                }));
            }
            return projectObj;
        });

        res.json({
            success: true,
            data: projectsData,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects',
        });
    }
});

// Get a single project
router.get('/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        const projectObj = project.toObject();

        // Add file paths to custom libraries
        if (projectObj.customLibraries && projectObj.customLibraries.length > 0) {
            projectObj.customLibraries = projectObj.customLibraries.map((lib: any) => ({
                ...lib,
                path: `/uploads/libraries/${project._id}/${lib.fileName}`
            }));
        }

        res.json({
            success: true,
            data: projectObj,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project',
        });
    }
});

// Create a new project
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, language } = req.body;
        const projectLanguage = language || 'python';

        // Get default file for the language
        const defaultFile = getDefaultFile(projectLanguage);

        // Create files array with default file
        const files: any[] = [{
            _id: new mongoose.Types.ObjectId(),
            name: defaultFile.name,
            content: defaultFile.content,
            language: projectLanguage,
            createdAt: new Date(),
            updatedAt: new Date(),
        }];

        // For JavaScript projects, also create a package.json file
        if (projectLanguage === 'javascript') {
            const packageJson = {
                name: name.toLowerCase().replace(/\s+/g, '-'),
                version: '1.0.0',
                description: description || 'A NexusQuest JavaScript project',
                main: defaultFile.name,
                scripts: {
                    start: `node ${defaultFile.name}`,
                    dev: `node ${defaultFile.name}`
                },
                keywords: [],
                author: '',
                license: 'ISC',
                dependencies: {}
            };

            files.push({
                _id: new mongoose.Types.ObjectId(),
                name: 'package.json',
                content: JSON.stringify(packageJson, null, 2),
                language: 'json',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // For Python projects, also create a requirements.txt file
        if (projectLanguage === 'python') {
            const requirementsTxt = `# Python dependencies
# Add your dependencies here, one per line
# Example: requests==2.31.0
# Example: numpy>=1.20.0
`;

            files.push({
                _id: new mongoose.Types.ObjectId(),
                name: 'requirements.txt',
                content: requirementsTxt,
                language: 'python',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // For C++ projects, create a CMakeLists.txt file
        if (projectLanguage === 'cpp') {
            const cmakeListsTxt = `cmake_minimum_required(VERSION 3.15)
project(NexusQuestProject CXX)

set(CMAKE_CXX_STANDARD 20)

find_package(fmt QUIET)
find_package(nlohmann_json QUIET)

file(GLOB SOURCES "*.cpp")
add_executable(main \${SOURCES})

if(fmt_FOUND)
    target_link_libraries(main fmt::fmt)
endif()

if(nlohmann_json_FOUND)
    target_link_libraries(main nlohmann_json::nlohmann_json)
endif()`;

            files.push({
                _id: new mongoose.Types.ObjectId(),
                name: 'CMakeLists.txt',
                content: cmakeListsTxt,
                language: 'cmake',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // For Java projects, create a pom.xml file
        if (projectLanguage === 'java') {
            const pomXml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<project xmlns="http://maven.apache.org/POM/4.0.0"\n' +
'         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
'         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 \n' +
'         http://maven.apache.org/xsd/maven-4.0.0.xsd">\n' +
'    <modelVersion>4.0.0</modelVersion>\n' +
'\n' +
'    <groupId>com.nexusquest</groupId>\n' +
'    <artifactId>' + name.toLowerCase().replace(/\s+/g, '-') + '</artifactId>\n' +
'    <version>1.0.0</version>\n' +
'    <packaging>jar</packaging>\n' +
'\n' +
'    <name>' + name + '</name>\n' +
'    <description>' + (description || 'A NexusQuest Java project') + '</description>\n' +
'\n' +
'    <properties>\n' +
'        <maven.compiler.source>17</maven.compiler.source>\n' +
'        <maven.compiler.target>17</maven.compiler.target>\n' +
'        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>\n' +
'    </properties>\n' +
'\n' +
'    <dependencies>\n' +
'        <!-- Add your dependencies here -->\n' +
'        <!-- Example: -->\n' +
'        <!--\n' +
'        <dependency>\n' +
'            <groupId>com.google.code.gson</groupId>\n' +
'            <artifactId>gson</artifactId>\n' +
'            <version>2.10.1</version>\n' +
'        </dependency>\n' +
'        -->\n' +
'    </dependencies>\n' +
'\n' +
'    <build>\n' +
'        <sourceDirectory>.</sourceDirectory>\n' +
'        <plugins>\n' +
'            <plugin>\n' +
'                <groupId>org.apache.maven.plugins</groupId>\n' +
'                <artifactId>maven-compiler-plugin</artifactId>\n' +
'                <version>3.11.0</version>\n' +
'                <configuration>\n' +
'                    <source>17</source>\n' +
'                    <target>17</target>\n' +
'                </configuration>\n' +
'            </plugin>\n' +
'            <plugin>\n' +
'                <groupId>org.codehaus.mojo</groupId>\n' +
'                <artifactId>exec-maven-plugin</artifactId>\n' +
'                <version>3.1.0</version>\n' +
'                <configuration>\n' +
'                    <mainClass>Main</mainClass>\n' +
'                </configuration>\n' +
'            </plugin>\n' +
'        </plugins>\n' +
'    </build>\n' +
'</project>';

            files.push({
                _id: new mongoose.Types.ObjectId(),
                name: 'pom.xml',
                content: pomXml,
                language: 'xml',
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        const project = await Project.create({
            name,
            description,
            language: projectLanguage,
            owner: req.userId,
            files,
        });

        // Check and unlock project-related achievements
        try {
            if (req.userId) {
                const newAchievements = await checkProjectAchievements(req.userId.toString());
                if (newAchievements.length > 0) {
                    console.log(`🏆 Unlocked ${newAchievements.length} new achievements:`);
                    newAchievements.forEach((ach: any) => {
                        console.log(`   - ${ach.icon} ${ach.title}`);
                    });
                }
            }
        } catch (achievementError) {
            console.error('Failed to check project achievements:', achievementError);
        }

        res.status(201).json({
            success: true,
            data: project,
        });
    } catch (error: unknown) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
            res.status(400).json({
                success: false,
                error: 'Project with this name already exists',
            });
            return;
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create project',
        });
    }
});

// Update a project
router.put('/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, language, dependencies } = req.body;

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        // Update basic fields
        if (name !== undefined) project.name = name;
        if (description !== undefined) project.description = description;
        if (language !== undefined) project.language = language;

        // Handle dependencies - store as plain object
        if (dependencies !== undefined) {
            if (typeof dependencies === 'object' && dependencies !== null) {
                project.dependencies = dependencies;
            } else {
                project.dependencies = {};
            }
        }

        await project.save();

        // Convert response data properly
        const projectObj = project.toObject();

        res.json({
            success: true,
            data: projectObj,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update project',
        });
    }
});

// Delete a project
router.delete('/:projectId', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOneAndDelete({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Project deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete project',
        });
    }
});

// === FILE ROUTES ===

// Add a file to a project
router.post('/:projectId/files', async (req: AuthRequest, res: Response) => {
    try {
        const { name, content, language } = req.body;

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        const newFile = {
            _id: new mongoose.Types.ObjectId(),
            name,
            content: content || '',
            language: language || project.language,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        project.files.push(newFile);
        await project.save();

        res.status(201).json({
            success: true,
            data: newFile,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to add file',
        });
    }
});

// Update a file in a project
router.put('/:projectId/files/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const { name, content, language } = req.body;

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        const file = project.files.find(
            (f) => f._id.toString() === req.params.fileId
        );

        if (!file) {
            res.status(404).json({
                success: false,
                error: 'File not found',
            });
            return;
        }

        if (name !== undefined) file.name = name;
        if (content !== undefined) file.content = content;
        if (language !== undefined) file.language = language;
        file.updatedAt = new Date();

        await project.save();

        res.json({
            success: true,
            data: file,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to update file',
        });
    }
});

// Delete a file from a project
router.delete('/:projectId/files/:fileId', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        const fileIndex = project.files.findIndex(
            (f) => f._id.toString() === req.params.fileId
        );

        if (fileIndex === -1) {
            res.status(404).json({
                success: false,
                error: 'File not found',
            });
            return;
        }

        project.files.splice(fileIndex, 1);
        await project.save();

        res.json({
            success: true,
            message: 'File deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete file',
        });
    }
});

// === DEPENDENCY ROUTES ===

// Get project dependencies
router.get('/:projectId/dependencies', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        // Convert Map to plain object if needed
        let deps = project.dependencies || {};
        if (deps instanceof Map) {
            deps = Object.fromEntries(deps);
        }

        res.json({
            success: true,
            dependencies: deps,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dependencies',
        });
    }
});

// Add or update a dependency
router.post('/:projectId/dependencies', async (req: AuthRequest, res: Response) => {
    try {
        const { name, version } = req.body;

        if (!name) {
            res.status(400).json({
                success: false,
                error: 'Dependency name is required',
            });
            return;
        }

        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        if (!project.dependencies) {
            project.dependencies = {};
        }

        // Add the new dependency
        project.dependencies[name] = version || '*';
        await project.save();

        res.status(201).json({
            success: true,
            dependencies: project.dependencies,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to add dependency',
        });
    }
});

// Update all dependencies
router.put('/:projectId/dependencies', async (req: AuthRequest, res: Response) => {
    try {
        const { dependencies } = req.body;

        if (!dependencies || typeof dependencies !== 'object') {
            res.status(400).json({
                success: false,
                error: 'Dependencies must be an object',
            });
            return;
        }

        // Find project first
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        // Update dependencies as plain object
        if (typeof dependencies === 'object' && dependencies !== null) {
            project.dependencies = dependencies;
        } else {
            project.dependencies = {};
        }
        await project.save();

        res.json({
            success: true,
            dependencies: project.dependencies,
        });
    } catch (error: any) {
        console.error('Error updating dependencies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update dependencies',
        });
    }
});

// Delete a specific dependency
router.delete('/:projectId/dependencies/:dependencyName', async (req: AuthRequest, res: Response) => {
    try {
        const project = await Project.findOne({
            _id: req.params.projectId,
            owner: req.userId,
        });

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        if (!project.dependencies) {
            project.dependencies = {};
        }

        delete project.dependencies[req.params.dependencyName];
        await project.save();

        res.json({
            success: true,
            message: 'Dependency deleted successfully',
            dependencies: project.dependencies,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to delete dependency',
        });
    }
});

export default router;