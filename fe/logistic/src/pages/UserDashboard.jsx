import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { FaStar, FaRegStar } from "react-icons/fa";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // Connecting to Socket.IO backend

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "15px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const speed = 40;

export default function UserDashboard() {
  const { user } = useAuth();
  const [activeBookings, setActiveBookings] = useState([]);
  const [recentBooking, setRecentBooking] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [scheduleBooking, setScheduleBooking] = useState(false);
  const [newBooking, setNewBooking] = useState({
    pickupLocation: null,
    dropoffLocation: null,
    pickupCoordinates: { coordinates: { lat: 0.0, lng: 0.0 } },
    dropoffCoordinates: { coordinates: { lat: 0.0, lng: 0.0 } },
    vehicleType: "car",
    scheduledAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [pastBookings, setPastBookings] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [bookingId, setBookingId] = useState("");
  const [alerted, setAlerted] = useState(false);
  const [directions, setDirections] = useState(null);

  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ["geometry", "places"],
  });

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await api.getUserBookings();
        const bookings = response.data.bookings;

        bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const completed = bookings.filter((b) => b.status === "completed");
        const active = bookings.filter((b) => b.status !== "completed");

        setRecentBooking(active[0] || null);
        setActiveBookings(active.slice(1));
        setPastBookings(completed);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  useEffect(() => {
    if (!recentBooking || !isLoaded) return;

    const bookingId = recentBooking._id;
    setBookingId(bookingId);
    socket.emit("joinBookingRoom", bookingId);

    // Listen for location updates
    socket.on("locationUpdate", async (data) => {
      const driverLoc = { lat: data.lat, lng: data.lng };
      setDriverLocation(driverLoc);
      let destination = null;
      if (recentBooking.status === "accepted") {
        destination = recentBooking.pickupCoordinates?.coordinates;
      } else if (recentBooking.status === "in_progress") {
        destination = recentBooking.dropoffCoordinates?.coordinates;
      }

      if (destination) {
        await calculateRoute(driverLoc, destination);
      }

      if (
        window.google &&
        window.google.maps &&
        window.google.maps.geometry &&
        recentBooking.pickupCoordinates
      ) {
        const pickupLocation = recentBooking.pickupCoordinates.coordinates;
        const driverLatLng = new window.google.maps.LatLng(data.lat, data.lng);
        const pickupLatLng = new window.google.maps.LatLng(
          pickupLocation.lat,
          pickupLocation.lng
        );

        const distance =
          window.google.maps.geometry.spherical.computeDistanceBetween(
            driverLatLng,
            pickupLatLng
          );

        // Alerting if within 1 km and not alerted yet
        if (distance <= 1000 && !alerted) {
          alert("Your driver is within 1 km of your pickup location!");
          setAlerted(true);
        }

        const speedMs = (speed * 1000) / 3600; // Convert speed to m/s
        const estimatedTimeSeconds = distance / speedMs;
        const estimatedTimeMinutes = Math.round(estimatedTimeSeconds / 60);
        setEta(estimatedTimeMinutes);
      }
    });

    // Listening for booking status updates
    socket.on(`booking:${bookingId}:status`, (data) => {
      setRecentBooking((prev) => ({ ...prev, status: data.status }));

      if (data.status === "completed" || data.status === "cancelled") {
        setAlerted(false);
        setEta(null);
        setDirections(null);
        setDriverLocation(null);
      }
    });

    return () => {
      socket.off("locationUpdate");
      socket.off(`booking:${bookingId}:status`);
    };
  }, [recentBooking, isLoaded, alerted]);

  const calculateRoute = async (origin, destination) => {
    if (!origin || !destination) return;

    const directionsService = new window.google.maps.DirectionsService();
    try {
      const result = await directionsService.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      setDirections(result);
    } catch (error) {
      console.error("Error calculating route:", error);
    }
  };

  useEffect(() => {
    if (driverLocation && mapRef.current) {
      mapRef.current.panTo(driverLocation);
    }
  }, [driverLocation]);

  const handleNewBookingChange = (field, value) => {
    setNewBooking((prev) => ({ ...prev, [field]: value }));
  };

  const handleRateDriver = async (bookingId, rating) => {
    try {
      await api.rateDriver({ bookingId, rating });
      alert("Driver rated successfully!");
      setPastBookings((prev) =>
        prev.map((booking) =>
          booking._id === bookingId ? { ...booking, rating } : booking
        )
      );
    } catch (error) {
      console.error("Error rating driver:", error);
      alert("Failed to rate driver.");
    }
  };

  const toggleScheduleBooking = () => setScheduleBooking(!scheduleBooking);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    try {
      const response = await api.createBooking({
        pickupLocation: newBooking.pickupLocation?.label,
        pickupCoordinates: newBooking.pickupCoordinates,
        dropoffLocation: newBooking.dropoffLocation?.label,
        dropoffCoordinates: newBooking.dropoffCoordinates,
        vehicleType: newBooking.vehicleType,
      });

      setBookingId(response.data.booking._id);

      alert("Booking created successfully!");
      setRecentBooking(response.data.booking);
      setAlerted(false);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking.");
    }
  };

  const handleScheduleBooking = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking({
        pickupLocation: newBooking.pickupLocation?.label,
        pickupCoordinates: newBooking.pickupCoordinates,
        dropoffLocation: newBooking.dropoffLocation?.label,
        dropoffCoordinates: newBooking.dropoffCoordinates,
        vehicleType: newBooking.vehicleType,
        scheduledAt: newBooking.scheduledAt,
      });

      alert("Booking scheduled successfully!");
    } catch (error) {
      console.error("Error scheduling booking:", error);
      alert("Failed to schedule booking.");
    }
  };

  const toggleBookingsView = () => setShowAllBookings(!showAllBookings);

  const mapCenter = useMemo(() => {
    return (
      driverLocation ||
      recentBooking?.pickupCoordinates?.coordinates ||
      defaultCenter
    );
  }, [driverLocation, recentBooking]);

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
    }),
    []
  );

  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-lg text-white">Loading bookings...</div>
      </div>
    );
  }

  const carIcon = {
    url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png", // Car icon URL
    scaledSize: new window.google.maps.Size(40, 40),
    anchor: new window.google.maps.Point(20, 20),
  };

  const renderStars = (booking) => {
    const totalStars = 5;
    const stars = [];

    for (let i = 1; i <= totalStars; i++) {
      if (booking.rating && i <= booking.rating) {
        stars.push(
          <FaStar key={i} className="text-yellow-400" onClick={() => {}} />
        );
      } else if (!booking.rating) {
        stars.push(
          <FaRegStar
            key={i}
            className="text-gray-400 cursor-pointer"
            onClick={() => handleRateDriver(booking._id, i)}
          />
        );
      } else {
        stars.push(
          <FaRegStar key={i} className="text-gray-400" onClick={() => {}} />
        );
      }
    }

    return stars;
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Hi, Welcome to Atlan Logistic Service
      </h2>
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Create or Schedule a New Booking
        </h3>
        <form className="space-y-4">
          <GooglePlacesAutocomplete
            selectProps={{
              value: newBooking.pickupLocation,
              onChange: (selectedPlace) => {
                if (
                  selectedPlace &&
                  selectedPlace.value &&
                  selectedPlace.value.place_id
                ) {
                  const service = new window.google.maps.places.PlacesService(
                    document.createElement("div")
                  );

                  service.getDetails(
                    {
                      placeId: selectedPlace.value.place_id,
                      fields: ["geometry", "formatted_address", "name"],
                    },
                    (place, status) => {
                      if (
                        status ===
                        window.google.maps.places.PlacesServiceStatus.OK
                      ) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        handleNewBookingChange("pickupCoordinates", {
                          coordinates: { lat, lng },
                        });

                        const pickupLocation = {
                          label: place.formatted_address,
                          name: place.name,
                          coordinates: { lat, lng },
                        };
                        handleNewBookingChange(
                          "pickupLocation",
                          pickupLocation
                        );
                      } else {
                        console.error("Error fetching place details:", status);
                      }
                    }
                  );
                }
              },
              placeholder: "Enter pickup location",
              className: "bg-gray-700 text-black rounded-md",
            }}
          />

          <GooglePlacesAutocomplete
            selectProps={{
              value: newBooking.dropoffLocation,
              onChange: (selectedPlace) => {
                if (
                  selectedPlace &&
                  selectedPlace.value &&
                  selectedPlace.value.place_id
                ) {
                  const service = new window.google.maps.places.PlacesService(
                    document.createElement("div")
                  );
                  service.getDetails(
                    {
                      placeId: selectedPlace.value.place_id,
                      fields: ["geometry", "formatted_address", "name"],
                    },
                    (place, status) => {
                      if (
                        status ===
                        window.google.maps.places.PlacesServiceStatus.OK
                      ) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        handleNewBookingChange("dropoffCoordinates", {
                          coordinates: { lat, lng },
                        });

                        const dropoffLocation = {
                          label: place.formatted_address,
                          name: place.name,
                          coordinates: { lat, lng },
                        };

                        handleNewBookingChange(
                          "dropoffLocation",
                          dropoffLocation
                        );
                      } else {
                        console.error("Error fetching place details:", status);
                      }
                    }
                  );
                }
              },
              placeholder: "Enter dropoff location",
              className: "bg-gray-700 text-black rounded-md",
            }}
          />

          <select
            value={newBooking.vehicleType}
            onChange={(e) =>
              handleNewBookingChange("vehicleType", e.target.value)
            }
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-md"
          >
            <option value="car">Car</option>
            <option value="truck">Truck</option>
            <option value="bike">Bike</option>
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={scheduleBooking}
              onChange={toggleScheduleBooking}
              className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label className="text-white">Schedule this booking</label>
          </div>

          {scheduleBooking && (
            <input
              type="datetime-local"
              value={newBooking.scheduledAt}
              onChange={(e) =>
                handleNewBookingChange("scheduledAt", e.target.value)
              }
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-md"
            />
          )}

          <div className="flex justify-between">
            <button
              onClick={handleCreateBooking}
              className="w-[48%] py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Booking
            </button>
            <button
              onClick={handleScheduleBooking}
              className="w-[48%] py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={!scheduleBooking}
            >
              Schedule Booking
            </button>
          </div>
        </form>
      </div>
      {recentBooking && (
        <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-md shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-4 text-center">
            Your Recent Booking
          </h3>
          <div>
            <p className="text-center">
              {recentBooking.pickupLocation} → {recentBooking.dropoffLocation}
            </p>
            <div className="text-center text-gray-300 space-y-2 mt-2">
              <p>Vehicle: {recentBooking.vehicleType}</p>
              <p>Status: {recentBooking.status}</p>
              <p className="font-bold text-green-400">
                Price: ₹{recentBooking.price}
              </p>
              {eta !== null && <p>Estimated Time of Arrival: {eta} minutes</p>}
            </div>
            {isLoaded && (
              <div className="mt-4">
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={14}
                  options={mapOptions}
                  onLoad={onLoad}
                >
                  {directions && <DirectionsRenderer directions={directions} />}
                  {driverLocation && (
                    <Marker
                      position={driverLocation}
                      icon={carIcon}
                      label={{
                        text: "Driver",
                        className: "map-marker-label",
                      }}
                    />
                  )}
                  {recentBooking.pickupCoordinates && (
                    <Marker
                      position={recentBooking.pickupCoordinates.coordinates}
                      label="Pickup"
                    />
                  )}
                  {recentBooking.dropoffCoordinates && (
                    <Marker
                      position={recentBooking.dropoffCoordinates.coordinates}
                      label="Dropoff"
                    />
                  )}
                </GoogleMap>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={toggleBookingsView}
        className="block mx-auto bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 mb-4"
      >
        {showAllBookings ? "Hide Active Bookings" : "View Active Bookings"}
      </button>

      {showAllBookings && (
        <div className="max-w-md mx-auto space-y-4">
          {activeBookings.map((booking) => (
            <div key={booking._id} className="bg-gray-800 p-4 rounded-md">
              <p>
                {booking.pickupLocation} → {booking.dropoffLocation}
              </p>
              <p>Vehicle: {booking.vehicleType}</p>
              <p>Status: {booking.status}</p>
            </div>
          ))}
        </div>
      )}
      <h3 className="text-xl font-semibold text-center mt-8">Past Bookings</h3>
      <div className="max-w-md mx-auto space-y-4">
        {pastBookings.map((booking) => (
          <div key={booking._id} className="bg-gray-800 p-4 rounded-md">
            <p>
              {booking.pickupLocation} → {booking.dropoffLocation}
            </p>
            <p>Vehicle: {booking.vehicleType}</p>
            <div className="flex mt-2">{renderStars(booking)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
