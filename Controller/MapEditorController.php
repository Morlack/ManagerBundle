<?php
/**
 * Created by PhpStorm.
 * User: mitchell
 * Date: 5/26/14
 * Time: 3:12 PM
 */

namespace EveMapp\ManagerBundle\Controller;


use EveMapp\ManagerBundle\Entity\MapObject;
use EveMapp\ManagerBundle\Entity\MapObjectImage;
use EveMapp\ManagerBundle\Entity\MapObjectPrice;
use EveMapp\ManagerBundle\Form\Type\MapObjectImageType;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class MapEditorController extends Controller
{

	public function getSubtoolAction($type)
	{
		switch ($type) {
			case "createToolButton":
				return $this->render('ManagerBundle:SubTools:createTool.html.twig', array());

			case "infoToolButton":
				$form = $this->createForm(new MapObjectImageType, new MapObjectImage());
				return $this->render('ManagerBundle:SubTools:infoTool.html.twig', array(
					'form' => $form->createView()));

			case "deleteToolButton":
				return $this->render('ManagerBundle:SubTools:deleteTool.html.twig');

			case "dragToolButton":
				return $this->render('ManagerBundle:SubTools:dragTool.html.twig');
			case "heatMapToolButton":
				return $this->render('ManagerBundle:SubTools:heatMapTool.html.twig');
		}

		return new Response("false");
	}

	public function mapObjectEditorAction($type, $id)
	{
		$data = array();

		$object = $this->getDoctrine()->getRepository("ManagerBundle:MapObject")->find($id);

		if($object) {
			switch($type) {
				case 'Prices':
					$data = $object->getPriceEntries();
					break;
				case 'Timetable':
					$data = $object->getLineUpEntries();
					break;
			}
		}


		return $this->render("ManagerBundle:MapObjectInfo:editorTemplate.html.twig", array(
			'type' => $type,
			'entries' => $data
		));
	}
} 