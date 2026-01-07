import mongoose from 'mongoose';

/**
 * Get default file name and content based on language
 */
export function getDefaultFile(language: string): { name: string; content: string } {
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
}

/**
 * Create default files for a project based on language
 */
export function createDefaultFiles(projectName: string, language: string, description?: string): any[] {
    const defaultFile = getDefaultFile(language);

    const files: any[] = [{
        _id: new mongoose.Types.ObjectId(),
        name: defaultFile.name,
        content: defaultFile.content,
        language: language,
        createdAt: new Date(),
        updatedAt: new Date(),
    }];

    // For JavaScript projects, also create a package.json file
    if (language === 'javascript') {
        const packageJson = {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
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

    // For Python projects, create requirements.txt
    if (language === 'python') {
        files.push({
            _id: new mongoose.Types.ObjectId(),
            name: 'requirements.txt',
            content: `# Python dependencies
# Add your dependencies here, one per line
# Example: requests==2.31.0
`,
            language: 'python',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    // For C++ projects, create CMakeLists.txt
    if (language === 'cpp') {
        files.push({
            _id: new mongoose.Types.ObjectId(),
            name: 'CMakeLists.txt',
            content: `cmake_minimum_required(VERSION 3.15)
project(NexusQuestProject CXX)
set(CMAKE_CXX_STANDARD 20)
file(GLOB SOURCES "*.cpp")
add_executable(main \${SOURCES})`,
            language: 'cmake',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    // For Java projects, create pom.xml
    if (language === 'java') {
        const safeName = projectName.toLowerCase().replace(/\s+/g, '-');
        files.push({
            _id: new mongoose.Types.ObjectId(),
            name: 'pom.xml',
            content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.nexusquest</groupId>
    <artifactId>${safeName}</artifactId>
    <version>1.0.0</version>
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
    </properties>
</project>`,
            language: 'xml',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    return files;
}

/**
 * Transform project custom libraries for API response
 */
export function transformCustomLibraries(project: any): any {
    const projectObj = project.toObject ? project.toObject() : project;

    if (projectObj.customLibraries && projectObj.customLibraries.length > 0) {
        projectObj.customLibraries = projectObj.customLibraries.map((lib: any) => ({
            _id: lib._id,
            fileName: lib.fileName,
            originalName: lib.originalName,
            fileType: lib.fileType,
            size: lib.size,
            uploadedAt: lib.uploadedAt,
            path: `/uploads/libraries/${projectObj._id}/${lib.fileName}`
        }));
    }

    return projectObj;
}

