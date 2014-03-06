module.exports = function(grunt) {
  grunt.initConfig({
    qunit: {
      all: {
        options: {
          urls: [
            'http://localhost:<%= connect.test.options.port %>/test'
          ]
        }
      }
    },

    connect: {
      test: {
        options: {
          port: process.env.PORT || 8000,
          base: '.'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-connect');

  grunt.registerTask('test', ['connect:test', 'qunit']);
  grunt.registerTask('develop', ['connect:test:keepalive']);
};
