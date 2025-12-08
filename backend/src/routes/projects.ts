import { Router, Response } from 'express';
import { Project } from '../models/Project.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';

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
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const projects = await Project.find({ owner: req.userId })
            .select('name description language files createdAt updatedAt')
            .sort({ updatedAt: -1 });

        res.json({
            success: true,
            data: projects,
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

        res.json({
            success: true,
            data: project,
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

        const project = await Project.create({
            name,
            description,
            language: projectLanguage,
            owner: req.userId,
            files,
        });

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
        const { name, description, language } = req.body;

        const project = await Project.findOneAndUpdate(
            { _id: req.params.projectId, owner: req.userId },
            { name, description, language },
            { new: true, runValidators: true }
        );

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        res.json({
            success: true,
            data: project,
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

        res.json({
            success: true,
            dependencies: project.dependencies || {},
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

        const project = await Project.findOneAndUpdate(
            { _id: req.params.projectId, owner: req.userId },
            { dependencies },
            { new: true, runValidators: true }
        );

        if (!project) {
            res.status(404).json({
                success: false,
                error: 'Project not found',
            });
            return;
        }

        res.json({
            success: true,
            dependencies: project.dependencies,
        });
    } catch (error) {
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