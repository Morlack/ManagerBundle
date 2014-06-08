<?php

namespace EveMapp\ManagerBundle\Entity;

use Doctrine\ORM\Mapping as ORM;
use EveMapp\ManagerBundle\Entity\MapObject;

/**
 * MapObjectPrice
 *
 * @ORM\Table()
 * @ORM\Entity
 */
class MapObjectPrice
{
    /**
     * @var integer
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

    /**
     * @var string
     *
     * @ORM\Column(name="name", type="string", length=255)
     */
    private $name;

    /**
     * @var float
     *
     * @ORM\Column(name="price", type="float")
     */
    private $price;

	/**
	 * @ORM\ManyToOne(targetEntity="MapObject", inversedBy="priceEntries", cascade={"persist"})
	 */
	private $mapObject;


    /**
     * Get id
     *
     * @return integer 
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * Set name
     *
     * @param string $name
     * @return MapObjectPrices
     */
    public function setName($name)
    {
        $this->name = $name;

        return $this;
    }

    /**
     * Get name
     *
     * @return string 
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * Set price
     *
     * @param float $price
     * @return MapObjectPrices
     */
    public function setPrice($price)
    {
        $this->price = $price;

        return $this;
    }

    /**
     * Get price
     *
     * @return float 
     */
    public function getPrice()
    {
        return $this->price;
    }

    /**
     * Set mapObject
     *
     * @param MapObject $mapObject
     * @return MapObjectPrice
     */
    public function setMapObject(MapObject $mapObject = null)
    {
        $this->mapObject = $mapObject;

        return $this;
    }

    /**
     * Get mapObject
     *
     * @return MapObject
     */
    public function getMapObject()
    {
        return $this->mapObject;
    }
}
