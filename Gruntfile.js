module.exports = function (grunt) {

    grunt.initConfig({
        typescript: {
            base: {
                src: ['src/**/*.ts'],
                dest: 'dist/commonjs',
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    basePath: 'src',
                    sourceMap: true,
                    declaration: true
                }
            }
        },
        execute: {
            target: {
                src: ['generate_versions.js']
            }
        },
        watch: {
            files: ['src/**/*.ts', "*.js", "dist/browser/*.js"],
            tasks: ['typescript', 'execute']
        }
    });

    grunt.loadNpmTasks('grunt-execute');
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['typescript', 'execute', 'watch']);

};