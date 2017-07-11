/**
 * UI to display output surface from Freesurfer using THREE.js
 */

'use strict';
$(function() {
    
    var config = {
        wf_api: '/api/wf',
        jwt: localStorage.getItem('jwt'),
        debug: true,
    };

    var url = new URL(window.location.href);
    var task_id = url.searchParams.get('free');
    var subdir = url.searchParams.get('sdir');

    if(config.debug) {
        task_id = "595fcb7c0f3f5d43e5bf2c95";
        subdir = "output";
        config.wf_api = "https://dev1.soichi.us/api/wf";
    }

    if (!config.jwt) {
        alert("Error: jwt not set");
        return;
    }
    
    // first thing to do, retrieve instance ids from tasks by getting tasks from given task ids in the url
    // get freesurfer task id
    $.ajax({
        beforeSend: xhr => xhr.setRequestHeader('Authorization', 'Bearer '+config.jwt),
        url: config.wf_api+'/task',
        data: {
            find: JSON.stringify({ _id: task_id })
        },
        success: data => {
            init_conview(data.tasks[0]);
        },
        error: console.error
    });
    
    function init_conview(task) {
        var view = $("#conview");
        var renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
        renderer.autoClear = false;
        renderer.setSize(view.width(), view.height());
        view.append(renderer.domElement);

        //scenes - back scene for brain siluet
        var scene = new THREE.Scene();
        var scene_front = new THREE.Scene();
        
        //camera
        var camera = new THREE.PerspectiveCamera( 45, view.width() / view.height(), 1, 5000);
        camera.rotation.x = Math.PI/2;
        camera.position.z = 200;

        //resize view
        $(window).on('resize', function() {
            camera.aspect = view.width() / view.height();
            camera.updateProjectionMatrix();
            renderer.setSize(view.width(), view.height());
        });
        
        // lighting
        var ambLight = new THREE.AmbientLight(0x606060);
        scene.add(ambLight);

		/* ambient and camera light is enough, I think
        var directionalLight = new THREE.DirectionalLight(0x606060);
        directionalLight.position.set( 0, 1, 0 ).normalize();
        scene.add( directionalLight );
        scene.add( directionalLight.target );
		*/

		//light the part that facing camera
        var camlight = new THREE.PointLight(0xffffff);
        camlight.position.copy(camera.position);
        scene.add(camlight);

		//axishelper
        var axisHelper = new THREE.AxisHelper(25);
        scene_front.add(axisHelper);
        
        //load vtk brain model from freesurfer
        var rid = task.resource_id;
        var base = task.instance_id + '/' + task._id;
        if (subdir) base += '/' + subdir;
        
        var vtk = new THREE.VTKLoader();
		var material = new THREE.MeshLambertMaterial({color: 0xcc9966, side: THREE.DoubleSide });

        //load left
        var path = encodeURIComponent(base+"/lh.10.vtk");
        vtk.load(config.wf_api+"/resource/download?r="+rid+"&p="+path+"&at="+config.jwt, geometry => {
			//geometry.center();
			geometry.computeVertexNormals();

            var mesh = new THREE.Mesh( geometry, material );
            mesh.rotation.x = -Math.PI/2;
            scene.add(mesh);
        });
        
        //load right
        var path = encodeURIComponent(base+"/rh.10.vtk");
        vtk.load(config.wf_api+"/resource/download?r="+rid+"&p="+path+"&at="+config.jwt, geometry => {
			//geometry.center();
			geometry.computeVertexNormals();

            var mesh = new THREE.Mesh( geometry, material );
            mesh.rotation.x = -Math.PI/2;
            scene.add(mesh);
        });
        
        //use OrbitControls and make camera light follow camera position
        var controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.autoRotate = true;
        controls.addEventListener('change', function() {
			camlight.position.copy(camera.position);
        });
        controls.addEventListener('start', function(){
            controls.autoRotate = false;
        });
        function animate_conview() {
            controls.update();

            renderer.clear();
            renderer.render( scene, camera );

			//draw front scene on top
            renderer.clearDepth();
            renderer.render( scene_front, camera );

            requestAnimationFrame( animate_conview );
        }
        
        animate_conview();
    }
});

